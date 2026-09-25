import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClienteBackups, Falha, Resultado, Versao } from '../../backup/cliente';
import { MENSAGEM_LIMITE } from '../../backup/cliente';
import type { EscopoBackup } from '../../backup/estado';
import { CHAVE_DESFAZER, montarEstadoBackup } from '../../backup/estado';
import { montarBackup } from '../../backup/gerar_completo';
import { DOCUMENTO_FICHAS } from '../../dados/fichas';
import { PERGUNTAS_POP } from '../../dados/pop';
import type { ArmazenamentoTexto } from '../../estado/armazenamento';
import { CHAVE_FPE, editarCampo, estadoFpeVazio, lerEstadoFpe } from '../../estado/armazenamento';
import { CHAVE_POP, editarResposta, estadoPopVazio, lerEstadoPop } from '../../estado/pop';
import { valoresPadrao } from '../fpe/modelo';
import { SalvarVersao } from '../comum/SalvarVersao';
import { TelaVersoes } from './TelaVersoes';

const ficha = DOCUMENTO_FICHAS.fichas[0]!;
const pergunta = PERGUNTAS_POP.perguntas[0]!;
const ID = (n: number) => `bk_20260925_1${String(n).padStart(5, '0')}_a0b1c2${String(n).padStart(2, '0')}`;

function versao(n: number, mudar: Partial<Versao> = {}): Versao {
  return { id: ID(n), rotulo: `Versão ${n}`, escopo: 'completo', criado_em: `2026-09-${String(10 + n).padStart(2, '0')}T10:00:00-03:00`, tamanho_bytes: 1000 * n, sha256: 'a'.repeat(64), versao_app: 'V08', protegido: false, ...mudar };
}

/** Servidor de mentira: mesma interface do cliente, com estado próprio e registro das chamadas. */
function servidorFalso(inicial: Versao[], opcoes: { limite?: number; falhar?: Partial<Record<keyof ClienteBackups, Falha>>; html?: Record<string, string> } = {}) {
  const estado = { itens: [...inicial], chamadas: [] as string[] };
  const limite = opcoes.limite ?? 10;
  const erro = <T,>(m: keyof ClienteBackups): Resultado<T> | null => {
    const f = opcoes.falhar?.[m];
    return f ? { ok: false, falha: f, mensagem: f === 'limite' ? MENSAGEM_LIMITE : `Falha simulada: ${f}.` } : null;
  };
  const cliente: ClienteBackups = {
    listar: async () => {
      estado.chamadas.push('listar');
      return erro('listar') ?? { ok: true, dados: { limite, total: estado.itens.length, itens: estado.itens.map((v) => ({ ...v })) } };
    },
    criar: async (d) => {
      estado.chamadas.push(`criar:${d.escopo}:${d.rotulo}`);
      const e = erro<{ id: string; item: Versao; limite: number; total: number }>('criar');
      if (e) return e;
      if (estado.itens.length >= limite) return { ok: false, falha: 'limite', mensagem: MENSAGEM_LIMITE, status: 409 };
      const item = versao(estado.itens.length + 50, { rotulo: d.rotulo, escopo: d.escopo });
      estado.itens.push(item);
      return { ok: true, dados: { id: item.id, item, limite, total: estado.itens.length } };
    },
    excluir: async (ids) => {
      estado.chamadas.push(`excluir:${ids.join(',')}`);
      const e = erro<{ excluidos: string[]; ignorados_protegidos: string[]; inexistentes: string[] }>('excluir');
      if (e) return e;
      const prot = ids.filter((id) => estado.itens.find((v) => v.id === id)?.protegido);
      const exc = ids.filter((id) => estado.itens.some((v) => v.id === id) && !prot.includes(id));
      estado.itens = estado.itens.filter((v) => !exc.includes(v.id));
      return { ok: true, dados: { excluidos: exc, ignorados_protegidos: prot, inexistentes: [] } };
    },
    renomear: async (id, rotulo) => {
      estado.chamadas.push(`renomear:${id}:${rotulo}`);
      const e = erro<Versao>('renomear');
      if (e) return e;
      const v = estado.itens.find((x) => x.id === id)!;
      v.rotulo = rotulo;
      return { ok: true, dados: { ...v } };
    },
    proteger: async (id, valor) => {
      estado.chamadas.push(`proteger:${id}:${valor}`);
      const e = erro<Versao>('proteger');
      if (e) return e;
      const v = estado.itens.find((x) => x.id === id)!;
      v.protegido = valor;
      return { ok: true, dados: { ...v } };
    },
    baixarTexto: async (id) => {
      estado.chamadas.push(`baixar:${id}`);
      const e = erro<string>('baixarTexto');
      if (e) return e;
      return { ok: true, dados: opcoes.html?.[id] ?? '<html>sem estado</html>' };
    },
    baixarZip: async (ids) => {
      estado.chamadas.push(`zip:${ids.join(',')}`);
      return erro<Blob>('baixarZip') ?? { ok: true, dados: new Blob([new Uint8Array([0x50, 0x4b, 3, 4])]) };
    },
    urlBaixar: (id) => `./api/backups.php?acao=baixar&id=${id}`,
    urlVer: (id) => `./api/backups.php?acao=ver&id=${id}`,
  };
  return { cliente, estado };
}

function storageFalso(inicial: Record<string, string> = {}): ArmazenamentoTexto & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial));
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) };
}

const AGORA = new Date(2026, 8, 25, 14, 30);
const tela = (s: ReturnType<typeof servidorFalso>, storage: ArmazenamentoTexto | null = storageFalso()) =>
  render(
    <MemoryRouter>
      <TelaVersoes cliente={s.cliente} armazenamento={storage} agora={() => AGORA} />
    </MemoryRouter>,
  );

const tabela = () => screen.getByRole('table');
const linha = (rotulo: string) => within(tabela()).getByText(rotulo).closest('tr')!;
const marcar = async (user: ReturnType<typeof userEvent.setup>, rotulo: string) => user.click(within(linha(rotulo)).getByRole('checkbox'));
const carregada = async () => screen.findByRole('table');

beforeEach(() => {
  // download de arquivos no jsdom
  URL.createObjectURL = vi.fn(() => 'blob:falso');
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});

describe('lista e contador', () => {
  it('mostra as versões com data, rótulo, escopo, tamanho, versão do app e proteção; contador “n de 10”', async () => {
    const s = servidorFalso([versao(1), versao(2, { protegido: true, escopo: 'fpe', rotulo: 'Antes da reunião' }), versao(3, { rotulo: '' })]);
    tela(s);
    await carregada();
    expect(screen.getByRole('heading', { level: 1, name: 'Versões salvas' })).toBeInTheDocument();
    expect(screen.getByText(/de 10 versões/).textContent).toBe('3 de 10 versões');
    const l2 = linha('Antes da reunião');
    expect(within(l2).getByText('FPE')).toBeInTheDocument();
    expect(within(l2).getByText(/Protegida/)).toBeInTheDocument();
    expect(within(l2).getByText('V08')).toBeInTheDocument();
    expect(within(l2).getByText('2 kB')).toBeInTheDocument();
    expect(screen.getByText('sem rótulo')).toBeInTheDocument();
    const resumo = screen.getByRole('list', { name: 'Resumo' });
    expect(resumo).toHaveTextContent('3 versões salvas');
    expect(resumo).toHaveTextContent('1 protegida');
  });

  it('as mais recentes vêm primeiro; “mais antigas primeiro” inverte', async () => {
    const user = userEvent.setup();
    tela(servidorFalso([versao(1), versao(3), versao(2)]));
    await carregada();
    const rotulos = () => within(tabela()).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[2]!.textContent);
    expect(rotulos()).toEqual(['Versão 3', 'Versão 2', 'Versão 1']);
    await user.selectOptions(screen.getByLabelText('Ordem'), 'antigas');
    expect(rotulos()).toEqual(['Versão 1', 'Versão 2', 'Versão 3']);
  });

  it('estado vazio explica o que fazer', async () => {
    tela(servidorFalso([]));
    expect(await screen.findByRole('heading', { level: 2, name: 'Nenhuma versão salva ainda' })).toBeInTheDocument();
    expect(screen.getByText(/0 de 10 versões|de 10 versões/).textContent).toBe('0 de 10 versões');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('estado de erro: mensagem clara, nada perdido, e “Tentar de novo” recarrega', async () => {
    const user = userEvent.setup();
    const s = servidorFalso([versao(1)], { falhar: { listar: 'sem_servidor' } });
    tela(s);
    expect(await screen.findByRole('heading', { level: 2, name: 'Não foi possível carregar as versões' })).toBeInTheDocument();
    expect(screen.getByText(/nada foi perdido/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(s.estado.chamadas.filter((c) => c === 'listar').length).toBeGreaterThanOrEqual(2));
  });

  it('avisa a partir de 8 versões e mostra limite cheio com 10', async () => {
    const oito = Array.from({ length: 8 }, (_, i) => versao(i + 1));
    const { unmount } = tela(servidorFalso(oito));
    await carregada();
    expect(screen.getByText(/Você está perto do limite: restam 2 vaga/)).toBeInTheDocument();
    unmount();
    tela(servidorFalso(Array.from({ length: 10 }, (_, i) => versao(i + 1))));
    await carregada();
    expect(screen.getByText(/Limite de 10 versões atingido: para salvar outra, exclua uma versão/)).toBeInTheDocument();
    tela(servidorFalso(Array.from({ length: 7 }, (_, i) => versao(i + 1))));
    await screen.findAllByRole('table');
  });

  it('a pré-visualização abre em outra aba (noopener) e baixar é um link para a API — nunca injeta o HTML na página', async () => {
    tela(servidorFalso([versao(1)]));
    await carregada();
    const ver = screen.getByRole('link', { name: /Pré-visualizar em outra aba/ });
    expect(ver).toHaveAttribute('target', '_blank');
    expect(ver.getAttribute('rel')).toContain('noopener');
    expect(ver).toHaveAttribute('href', `./api/backups.php?acao=ver&id=${ID(1)}`);
    expect(screen.getByRole('link', { name: /Baixar \.html/ })).toHaveAttribute('href', `./api/backups.php?acao=baixar&id=${ID(1)}`);
    expect(document.querySelector('iframe')).toBeNull();
  });
});

describe('filtro, busca e seleção', () => {
  const dados = () => [versao(1, { rotulo: 'Reunião com a diretoria', escopo: 'fpe' }), versao(2, { rotulo: 'Fechamento do POP', escopo: 'pop' }), versao(3, { rotulo: 'Versão completa', escopo: 'completo' }), versao(4, { rotulo: 'Rascunho', escopo: 'fpe' })];

  it('filtra por escopo e busca no rótulo sem diferenciar acento nem maiúscula', async () => {
    const user = userEvent.setup();
    tela(servidorFalso(dados()));
    await carregada();
    await user.selectOptions(screen.getByLabelText('Mostrar'), 'fpe');
    expect(within(tabela()).getAllByRole('row')).toHaveLength(3); // cabeçalho + 2
    await user.selectOptions(screen.getByLabelText('Mostrar'), 'todos');
    await user.type(screen.getByLabelText('Buscar no rótulo'), 'REUNIAO');
    expect(within(tabela()).getAllByRole('row')).toHaveLength(2);
    expect(within(tabela()).getByText('Reunião com a diretoria')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Buscar no rótulo'));
    await user.type(screen.getByLabelText('Buscar no rótulo'), 'nao existe');
    expect(screen.getByText('Nenhuma versão combina com o filtro.')).toBeInTheDocument();
  });

  it('seleciona uma, várias e todas; “selecionar todas” fica indeterminado quando só parte está marcada', async () => {
    const user = userEvent.setup();
    tela(servidorFalso(dados()));
    await carregada();
    const todas = screen.getByRole('checkbox', { name: 'Selecionar todas as versões mostradas' }) as HTMLInputElement;
    expect(screen.getByText('Nenhuma versão selecionada.')).toBeInTheDocument();
    await marcar(user, 'Rascunho');
    expect(screen.getByText('1 versão selecionada.')).toBeInTheDocument();
    expect(todas.indeterminate).toBe(true);
    expect(todas.checked).toBe(false);
    await user.click(todas);
    expect(todas.checked).toBe(true);
    expect(todas.indeterminate).toBe(false);
    expect(screen.getByText('4 versões selecionadas.')).toBeInTheDocument();
    await user.click(todas);
    expect(screen.getByText('Nenhuma versão selecionada.')).toBeInTheDocument();
  });

  it('a seleção sobrevive ao filtrar, buscar e reordenar; “todas” age só sobre o que está à vista', async () => {
    const user = userEvent.setup();
    tela(servidorFalso(dados()));
    await carregada();
    await marcar(user, 'Fechamento do POP'); // escopo pop
    await user.selectOptions(screen.getByLabelText('Mostrar'), 'fpe'); // some da tela, continua selecionada
    expect(screen.getByText('1 versão selecionada.')).toBeInTheDocument();
    const todas = screen.getByRole('checkbox', { name: 'Selecionar todas as versões mostradas' }) as HTMLInputElement;
    await user.click(todas); // marca as 2 de FPE
    expect(screen.getByText('3 versões selecionadas.')).toBeInTheDocument();
    await user.click(todas); // desmarca só as 2 de FPE
    expect(screen.getByText('1 versão selecionada.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Mostrar'), 'todos');
    await user.selectOptions(screen.getByLabelText('Ordem'), 'antigas');
    expect(within(linha('Fechamento do POP')).getByRole('checkbox')).toBeChecked();
  });

  it('cada linha tem uma caixa com nome acessível (rótulo e data)', async () => {
    tela(servidorFalso([versao(1, { rotulo: 'Reunião' })]));
    await carregada();
    expect(screen.getByRole('checkbox', { name: /^Selecionar versão: Reunião, / })).toBeInTheDocument();
  });
});

describe('proteger e renomear', () => {
  it('proteger e desproteger uma versão pelo botão da linha (aria-pressed)', async () => {
    const user = userEvent.setup();
    const s = servidorFalso([versao(1, { rotulo: 'Reunião' })]);
    tela(s);
    await carregada();
    await user.click(screen.getByRole('button', { name: /^Proteger: Reunião/ }));
    expect(await screen.findByText(/Versão protegida: Reunião/)).toBeInTheDocument();
    const botao = screen.getByRole('button', { name: /^Remover a proteção de: Reunião/ });
    expect(botao).toHaveAttribute('aria-pressed', 'true');
    await user.click(botao);
    expect(await screen.findByText(/Proteção removida: Reunião/)).toBeInTheDocument();
    expect(s.estado.chamadas).toContain(`proteger:${ID(1)}:true`);
    expect(s.estado.chamadas).toContain(`proteger:${ID(1)}:false`);
  });

  it('renomear inline: salvar troca o rótulo; Esc cancela sem chamar o servidor', async () => {
    const user = userEvent.setup();
    const s = servidorFalso([versao(1, { rotulo: 'Antigo' })]);
    tela(s);
    await carregada();
    await user.click(screen.getByRole('button', { name: /^Renomear: Antigo/ }));
    const campo = screen.getByLabelText('Novo rótulo');
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText('Novo rótulo')).not.toBeInTheDocument();
    expect(s.estado.chamadas.some((c) => c.startsWith('renomear'))).toBe(false);
    void campo;
    await user.click(screen.getByRole('button', { name: /^Renomear: Antigo/ }));
    await user.clear(screen.getByLabelText('Novo rótulo'));
    await user.type(screen.getByLabelText('Novo rótulo'), 'Novo nome');
    await user.click(screen.getByRole('button', { name: 'Salvar rótulo' }));
    expect(await screen.findByText('Rótulo atualizado.')).toBeInTheDocument();
    expect(within(tabela()).getByText('Novo nome')).toBeInTheDocument();
  });

  it('erro do servidor ao proteger aparece como alerta e nada muda na tela', async () => {
    const user = userEvent.setup();
    tela(servidorFalso([versao(1)], { falhar: { proteger: 'erro' } }));
    await carregada();
    await user.click(screen.getByRole('button', { name: /^Proteger:/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha simulada');
    expect(screen.queryByText(/🔒/)).not.toBeInTheDocument();
  });

  it('proteger e desproteger em lote afetam só as selecionadas', async () => {
    const user = userEvent.setup();
    const s = servidorFalso([versao(1), versao(2), versao(3)]);
    tela(s);
    await carregada();
    await marcar(user, 'Versão 1');
    await marcar(user, 'Versão 2');
    await user.click(screen.getByRole('button', { name: 'Proteger' }));
    await waitFor(() => expect(s.estado.itens.filter((v) => v.protegido).map((v) => v.rotulo).sort()).toEqual(['Versão 1', 'Versão 2']));
    await user.click(screen.getByRole('button', { name: 'Desproteger' }));
    await waitFor(() => expect(s.estado.itens.some((v) => v.protegido)).toBe(false));
  });
});

describe('excluir (sempre com confirmação; protegidas ficam de fora)', () => {
  it('pede confirmação listando o que será apagado; cancelar não chama o servidor', async () => {
    const user = userEvent.setup();
    const s = servidorFalso([versao(1), versao(2)]);
    tela(s);
    await carregada();
    await marcar(user, 'Versão 1');
    await user.click(screen.getByRole('button', { name: 'Excluir…' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Confirmar exclusão' });
    expect(dialogo).toHaveTextContent('Excluir esta versão? Não dá para desfazer.');
    expect(within(dialogo).getByText(/Versão 1,/)).toBeInTheDocument();
    expect(dialogo).toHaveFocus();
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(s.estado.chamadas.some((c) => c.startsWith('excluir'))).toBe(false);
    expect(within(tabela()).getByText('Versão 1')).toBeInTheDocument();
  });

  it('confirmar exclui só as não protegidas, avisa das protegidas, devolve o foco e atualiza o contador', async () => {
    const user = userEvent.setup();
    const s = servidorFalso([versao(1), versao(2, { protegido: true }), versao(3)]);
    tela(s);
    await carregada();
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar todas as versões mostradas' }));
    await user.click(screen.getByRole('button', { name: 'Excluir…' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Confirmar exclusão' });
    expect(dialogo).toHaveTextContent('Excluir estas 2 versões?');
    expect(dialogo).toHaveTextContent('1 versão protegida fica de fora');
    await user.click(within(dialogo).getByRole('button', { name: 'Excluir definitivamente' }));
    expect(await screen.findByText(/2 versões excluídas\./)).toBeInTheDocument();
    expect(s.estado.chamadas.find((c) => c.startsWith('excluir'))).toBe(`excluir:${ID(1)},${ID(3)}`);
    expect(s.estado.itens.map((v) => v.rotulo)).toEqual(['Versão 2']);
    expect(screen.getByText(/de 10 versões/).textContent).toBe('1 de 10 versões');
    await waitFor(() => expect(document.activeElement?.className).toContain('versoes__topo'));
    expect(screen.getByText('1 versão selecionada.')).toBeInTheDocument(); // a protegida continua existindo e continua marcada
  });

  it('só protegidas selecionadas: explica e não oferece excluir', async () => {
    const user = userEvent.setup();
    const s = servidorFalso([versao(1, { protegido: true })]);
    tela(s);
    await carregada();
    await marcar(user, 'Versão 1');
    await user.click(screen.getByRole('button', { name: 'Excluir…' }));
    const dialogo = screen.getByRole('alertdialog');
    expect(dialogo).toHaveTextContent('estão protegidas e não podem ser excluídas');
    expect(within(dialogo).queryByRole('button', { name: 'Excluir definitivamente' })).not.toBeInTheDocument();
    expect(s.estado.chamadas.some((c) => c.startsWith('excluir'))).toBe(false);
  });

  it('erro do servidor ao excluir: alerta e nada some da lista', async () => {
    const user = userEvent.setup();
    tela(servidorFalso([versao(1)], { falhar: { excluir: 'erro' } }));
    await carregada();
    await marcar(user, 'Versão 1');
    await user.click(screen.getByRole('button', { name: 'Excluir…' }));
    await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha simulada');
    expect(within(tabela()).getByText('Versão 1')).toBeInTheDocument();
  });

  it('os botões do lote ficam desativados sem seleção; o índice sempre pode ser baixado', async () => {
    const user = userEvent.setup();
    tela(servidorFalso([versao(1), versao(2)]));
    await carregada();
    for (const nome of ['Baixar .zip', 'Proteger', 'Desproteger', 'Excluir…']) expect(screen.getByRole('button', { name: nome })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Exportar índice (.json)' }));
    expect(await screen.findByText(/Índice baixado \(2 versões/)).toBeInTheDocument();
  });
});

describe('baixar em lote', () => {
  it('.zip das selecionadas e índice JSON só com metadados', async () => {
    const user = userEvent.setup();
    const s = servidorFalso([versao(1), versao(2), versao(3)]);
    tela(s);
    await carregada();
    await marcar(user, 'Versão 1');
    await marcar(user, 'Versão 3');
    await user.click(screen.getByRole('button', { name: 'Baixar .zip' }));
    expect(await screen.findByText(/Arquivo \.zip baixado com 2 versões/)).toBeInTheDocument();
    expect(s.estado.chamadas.find((c) => c.startsWith('zip'))).toBe(`zip:${ID(1)},${ID(3)}`);
    await user.click(screen.getByRole('button', { name: 'Exportar índice (.json)' }));
    expect(await screen.findByText(/Índice baixado \(2 versões/)).toBeInTheDocument();
  });

  it('servidor sem .zip: mensagem clara', async () => {
    const user = userEvent.setup();
    tela(servidorFalso([versao(1)], { falhar: { baixarZip: 'zip_indisponivel' } }));
    await carregada();
    await marcar(user, 'Versão 1');
    await user.click(screen.getByRole('button', { name: 'Baixar .zip' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha simulada: zip_indisponivel');
  });
});

describe('restaurar e desfazer', () => {
  const fpe0 = editarCampo(estadoFpeVazio(), ficha.id, valoresPadrao(ficha), 'what', 'Texto de agora', '2026-09-25T10:00:00.000Z');
  const pop0 = editarResposta(estadoPopVazio(), pergunta.id, pergunta.resposta_padrao, 'Resposta de agora', '2026-09-25T10:00:00.000Z');
  const doBackup = (escopo: EscopoBackup) => montarBackup(escopo, 'guardada', editarCampo(estadoFpeVazio(), ficha.id, valoresPadrao(ficha), 'what', 'Texto do backup', '2026-09-25T09:00:00.000Z'), editarResposta(estadoPopVazio(), pergunta.id, pergunta.resposta_padrao, 'Resposta do backup', '2026-09-25T09:00:00.000Z'), AGORA).html;
  const armazenamentoAtual = () => storageFalso({ [CHAVE_FPE]: JSON.stringify(fpe0), [CHAVE_POP]: JSON.stringify(pop0) });

  it('pede confirmação explicando que substitui; cancelar não muda nada', async () => {
    const user = userEvent.setup();
    const st = armazenamentoAtual();
    const s = servidorFalso([versao(1, { rotulo: 'Guardada' })], { html: { [ID(1)]: doBackup('completo') } });
    tela(s, st);
    await carregada();
    await user.click(screen.getByRole('button', { name: /^Restaurar: Guardada/ }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Confirmar restauração' });
    expect(dialogo).toHaveTextContent('substitui o que está neste navegador no FPE e no POP');
    expect(dialogo).toHaveTextContent('dá para desfazer');
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(s.estado.chamadas.some((c) => c.startsWith('baixar'))).toBe(false);
    expect(lerEstadoFpe(st).estado.fpe_edicoes[ficha.id]?.campos.what).toBe('Texto de agora');
  });

  it('restaurar substitui o estado local, guarda o ponto de desfazer e o botão “Desfazer” devolve o de antes', async () => {
    const user = userEvent.setup();
    const st = armazenamentoAtual();
    const s = servidorFalso([versao(1, { rotulo: 'Guardada' })], { html: { [ID(1)]: doBackup('completo') } });
    tela(s, st);
    await carregada();
    expect(screen.queryByRole('button', { name: 'Desfazer última restauração' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Restaurar: Guardada/ }));
    await user.click(screen.getByRole('button', { name: 'Restaurar esta versão' }));
    expect(await screen.findByText(/Versão restaurada \(FPE e POP\): Guardada/)).toBeInTheDocument();
    expect(lerEstadoFpe(st).estado.fpe_edicoes[ficha.id]?.campos.what).toBe('Texto do backup');
    expect(lerEstadoPop(st).estado.pop_respostas[pergunta.id]?.texto).toBe('Resposta do backup');
    expect(st.dados.has(CHAVE_DESFAZER)).toBe(true);
    await user.click(await screen.findByRole('button', { name: 'Desfazer última restauração' }));
    expect(await screen.findByText(/Restauração desfeita/)).toBeInTheDocument();
    expect(lerEstadoFpe(st).estado.fpe_edicoes[ficha.id]?.campos.what).toBe('Texto de agora');
    expect(lerEstadoPop(st).estado.pop_respostas[pergunta.id]?.texto).toBe('Resposta de agora');
  });

  it('versão só de FPE restaura só o FPE: o POP fica como estava', async () => {
    const user = userEvent.setup();
    const st = armazenamentoAtual();
    tela(servidorFalso([versao(1, { rotulo: 'Só FPE', escopo: 'fpe' })], { html: { [ID(1)]: doBackup('fpe') } }), st);
    await carregada();
    await user.click(screen.getByRole('button', { name: /^Restaurar: Só FPE/ }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('no FPE');
    await user.click(screen.getByRole('button', { name: 'Restaurar esta versão' }));
    await screen.findByText(/Versão restaurada \(FPE\)/);
    expect(lerEstadoFpe(st).estado.fpe_edicoes[ficha.id]?.campos.what).toBe('Texto do backup');
    expect(lerEstadoPop(st).estado.pop_respostas[pergunta.id]?.texto).toBe('Resposta de agora');
  });

  it.each([
    ['arquivo sem o bloco de estado', '<html>oi</html>', /não é uma versão salva desta ferramenta/],
    ['bloco corrompido', '<script type="application/json" id="lux-estado">{quebrado</script>', /não é um JSON válido/],
  ])('%s: mensagem clara e o estado local intacto', async (_nome, html, msg) => {
    const user = userEvent.setup();
    const st = armazenamentoAtual();
    tela(servidorFalso([versao(1, { rotulo: 'Ruim' })], { html: { [ID(1)]: html } }), st);
    await carregada();
    await user.click(screen.getByRole('button', { name: /^Restaurar: Ruim/ }));
    await user.click(screen.getByRole('button', { name: 'Restaurar esta versão' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(msg);
    expect(lerEstadoFpe(st).estado.fpe_edicoes[ficha.id]?.campos.what).toBe('Texto de agora');
    expect(st.dados.has(CHAVE_DESFAZER)).toBe(false);
  });

  it('erro ao baixar a versão do servidor: alerta e nada muda', async () => {
    const user = userEvent.setup();
    const st = armazenamentoAtual();
    tela(servidorFalso([versao(1, { rotulo: 'Sumiu' })], { falhar: { baixarTexto: 'nao_encontrado' } }), st);
    await carregada();
    await user.click(screen.getByRole('button', { name: /^Restaurar: Sumiu/ }));
    await user.click(screen.getByRole('button', { name: 'Restaurar esta versão' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha simulada');
    expect(lerEstadoFpe(st).estado.fpe_edicoes[ficha.id]?.campos.what).toBe('Texto de agora');
  });

  it('o backup só do FPE tem o estado do POP vazio no bloco (o escopo manda)', () => {
    expect(montarEstadoBackup('fpe', fpe0, pop0, AGORA).pop_respostas).toEqual({});
  });
});

describe('Salvar versão', () => {
  const salvar = (s: ReturnType<typeof servidorFalso>, escopo: EscopoBackup = 'completo', aoSalvar?: () => void) =>
    render(
      <MemoryRouter>
        <SalvarVersao escopoPadrao={escopo} cliente={s.cliente} estadoFpe={estadoFpeVazio()} estadoPop={estadoPopVazio()} aoSalvar={aoSalvar} />
      </MemoryRouter>,
    );

  it('com servidor: abre o formulário, salva com rótulo e escopo, e avisa “n de 10”', async () => {
    const user = userEvent.setup();
    const s = servidorFalso([versao(1)]);
    const aoSalvar = vi.fn();
    salvar(s, 'pop', aoSalvar);
    const botao = screen.getByRole('button', { name: 'Salvar versão' });
    await waitFor(() => expect(botao).toBeEnabled());
    await user.click(botao);
    expect(screen.getByLabelText('O que salvar')).toHaveValue('pop');
    await user.type(screen.getByLabelText(/Rótulo/), 'Antes da reunião');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Versão salva (2 de 10).')).toBeInTheDocument();
    expect(s.estado.chamadas).toContain('criar:pop:Antes da reunião');
    expect(aoSalvar).toHaveBeenCalledTimes(1);
  });

  it('sem servidor: “Salvar versão” desativado com explicação, e “Baixar arquivo” continua funcionando', async () => {
    const user = userEvent.setup();
    salvar(servidorFalso([], { falhar: { listar: 'sem_servidor' } }));
    const botao = screen.getByRole('button', { name: 'Salvar versão' });
    expect(await screen.findByText(/O servidor de versões não está disponível aqui/)).toBeInTheDocument();
    expect(botao).toBeDisabled();
    expect(botao).toHaveAccessibleDescription(/servidor de versões não está disponível/);
    await user.click(screen.getByRole('button', { name: 'Baixar arquivo' }));
    expect(await screen.findByText(/Arquivo baixado/)).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('11º salvamento (409): mostra a mensagem do plano e só oferece excluir a mais antiga NÃO protegida, com confirmação', async () => {
    const user = userEvent.setup();
    const cheio = Array.from({ length: 10 }, (_, i) => versao(i + 1, { protegido: i === 0 })); // a mais antiga (1) é protegida
    const s = servidorFalso(cheio);
    salvar(s);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar versão' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Salvar versão' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Limite de 10 versões atingido. Exclua versões antigas ou substitua a mais antiga não protegida.');
    const dialogo = screen.getByRole('alertdialog', { name: 'Confirmar exclusão da versão mais antiga' });
    expect(dialogo).toHaveTextContent('Versão 2'); // a 1 é protegida: não é a escolhida
    expect(s.estado.chamadas.some((c) => c.startsWith('excluir'))).toBe(false); // nada apagado sem confirmar
    await user.click(within(dialogo).getByRole('button', { name: 'Excluir a mais antiga e salvar' }));
    expect(await screen.findByText(/Versão salva \(10 de 10\)/)).toBeInTheDocument();
    expect(s.estado.chamadas.find((c) => c.startsWith('excluir'))).toBe(`excluir:${ID(2)}`);
  });

  it('cancelar a substituição não apaga nada', async () => {
    const user = userEvent.setup();
    const s = servidorFalso(Array.from({ length: 10 }, (_, i) => versao(i + 1)));
    salvar(s);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar versão' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Salvar versão' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Confirmar exclusão da versão mais antiga' });
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(s.estado.chamadas.some((c) => c.startsWith('excluir'))).toBe(false);
    expect(s.estado.itens).toHaveLength(10);
  });

  it('com as 10 protegidas, explica onde resolver e não oferece excluir', async () => {
    const user = userEvent.setup();
    salvar(servidorFalso(Array.from({ length: 10 }, (_, i) => versao(i + 1, { protegido: true }))));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar versão' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Salvar versão' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Todas as versões estão protegidas');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it.each([
    ['sem_acesso', /Falha simulada: sem_acesso/],
    ['invalido', /Falha simulada: invalido/],
    ['erro', /Falha simulada: erro/],
  ] as const)('falha %s: mostra a mensagem e não perde o que foi digitado', async (falhaCriar, msg) => {
    const user = userEvent.setup();
    salvar(servidorFalso([], { falhar: { criar: falhaCriar } }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar versão' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Salvar versão' }));
    await user.type(screen.getByLabelText(/Rótulo/), 'Meu rótulo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(msg);
    expect(screen.getByLabelText(/Rótulo/)).toHaveValue('Meu rótulo');
  });

  it('o nome do arquivo baixado segue versao_<escopo>_<data>_<hora>.html', async () => {
    const { nomeArquivoVersao } = await import('../comum/SalvarVersao');
    expect(nomeArquivoVersao('fpe', new Date(2026, 8, 5, 9, 7))).toBe('versao_fpe_2026-09-05_0907.html');
  });
});

