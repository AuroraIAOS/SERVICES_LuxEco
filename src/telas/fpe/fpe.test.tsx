import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DOCUMENTO_FICHAS } from '../../dados/fichas';
import { MATRIZ_V08 } from '../../dados/matriz';
import { CHAVE_FPE, estadoFpeVazio } from '../../estado/armazenamento';
import type { ArmazenamentoTexto, EstadoFpe } from '../../estado/armazenamento';
import { matrizComEdicoes, montarFpe, resolverSelecao } from './modelo';
import { TelaFpe } from './TelaFpe';

const clone = <T,>(x: T): T => structuredClone(x);

function falso(inicial?: EstadoFpe, opcoes: { setLanca?: boolean } = {}): ArmazenamentoTexto & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  if (inicial) dados.set(CHAVE_FPE, JSON.stringify(inicial));
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => {
      if (opcoes.setLanca) throw new DOMException('cota', 'QuotaExceededError');
      dados.set(k, v);
    },
  };
}
const guardado = (s: { dados: Map<string, string> }): EstadoFpe => JSON.parse(s.dados.get(CHAVE_FPE) ?? JSON.stringify(estadoFpeVazio())) as EstadoFpe;

const tela = (armazenamento: ArmazenamentoTexto | null, dados = MATRIZ_V08, fichas = DOCUMENTO_FICHAS) =>
  render(
    <MemoryRouter>
      <TelaFpe armazenamento={armazenamento} dados={dados} fichas={fichas} />
    </MemoryRouter>,
  );

/** botão da ficha na lista: o nome pode ganhar “Editada”/“IF/ELSE” no fim, então casa pelo começo. */
const fichaBtn = (texto: string) => ({ name: (nome: string) => nome.startsWith(texto) });

async function ir(user: ReturnType<typeof userEvent.setup>, setor: RegExp, estagio: RegExp, ficha?: string) {
  await user.click(screen.getByRole('button', { name: setor }));
  await user.click(screen.getByRole('button', { name: estagio }));
  if (ficha) await user.click(screen.getByRole('button', fichaBtn(ficha)));
}

describe('modelo do FPE', () => {
  const fpe = montarFpe(MATRIZ_V08, DOCUMENTO_FICHAS, estadoFpeVazio());

  it('236 fichas em 12 setores; soma por setor e por estágio fecha; nada editado', () => {
    expect(fpe.totalFichas).toBe(236);
    expect(fpe.setores).toHaveLength(12);
    expect(fpe.setores.reduce((s, x) => s + x.totalFichas, 0)).toBe(236);
    for (const s of fpe.setores) expect(s.estagios.reduce((t, e) => t + e.fichas.length, 0)).toBe(s.totalFichas);
    expect(fpe.totalEditadas).toBe(0);
  });

  it('as fichas de cada estágio seguem a ordem da Matriz e valores em vigor = padrão sem edições', () => {
    const vendas = fpe.setores.find((s) => s.setor.nome === 'Vendas')!;
    const est2 = vendas.estagios.find((e) => e.estagio.id === 2)!;
    expect(est2.fichas[0]!.valores.what).toBe('Aborda o lead rapidamente');
    for (const f of est2.fichas) expect(f.valores).toEqual(f.padrao);
  });

  it('resolverSelecao cai no primeiro item válido quando o pedido some', () => {
    const s = resolverSelecao(fpe, { setorId: 'setor_99' })!;
    expect(s.setorId).toBe(fpe.setores[0]!.setor.id);
    const b = resolverSelecao(fpe, { setorId: 'setor_02', estagioId: 99 })!;
    expect(b.setorId).toBe('setor_02');
    expect(b.estagioId).toBe(fpe.setores.find((x) => x.setor.id === 'setor_02')!.estagios[0]!.estagio.id);
    expect(resolverSelecao({ setores: [], totalFichas: 0, totalEditadas: 0 })).toBeNull();
  });

  it('matrizComEdicoes troca só o texto da ação editada; “O quê” vazio não vira nó em branco; sem edição devolve a mesma matriz', () => {
    expect(matrizComEdicoes(MATRIZ_V08, DOCUMENTO_FICHAS, estadoFpeVazio())).toBe(MATRIZ_V08);
    const ficha = DOCUMENTO_FICHAS.fichas[0]!;
    const est: EstadoFpe = { schema_versao: 1, fpe_edicoes: { [ficha.id]: { campos: { what: 'Texto novo' }, origem: 'manual', atualizado_em: 'x' } } };
    const m = matrizComEdicoes(MATRIZ_V08, DOCUMENTO_FICHAS, est);
    expect(m.acoes.find((a) => a.id === ficha.acao_id)!.texto).toBe('Texto novo');
    expect(m.acoes.filter((a) => a.texto === 'Texto novo')).toHaveLength(1);
    const vazio = matrizComEdicoes(MATRIZ_V08, DOCUMENTO_FICHAS, { ...est, fpe_edicoes: { [ficha.id]: { campos: { what: '  ' }, origem: 'manual', atualizado_em: 'x' } } });
    expect(vazio.acoes.find((a) => a.id === ficha.acao_id)!.texto).toBe(ficha.what);
  });
});

describe('tela FPE', () => {
  it('abre com a primeira ficha pré-preenchida com os valores da V08 e os números calculados', () => {
    tela(falso());
    expect(screen.getByRole('heading', { level: 1, name: 'FPE' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Resumo' })).toHaveTextContent('236 fichas');
    const primeira = DOCUMENTO_FICHAS.fichas.find((f) => f.setor_id === 'setor_01')!;
    expect(screen.getByLabelText(/^O quê/)).toHaveValue(primeira.what);
    expect(screen.getByLabelText(/^Por quê/)).toHaveValue(primeira.why);
    expect(screen.getByLabelText(/^Quem/)).toHaveValue(primeira.who);
    expect(screen.getByRole('button', { name: 'Restaurar o padrão da ficha: ' + primeira.what })).toBeDisabled();
  });

  it('navega setor → estágio → ficha e o formulário mostra a ficha escolhida', async () => {
    const user = userEvent.setup();
    tela(falso());
    await ir(user, /^Vendas/, /Atendimento/, 'Contorna objeções do cliente');
    const f = DOCUMENTO_FICHAS.fichas.find((x) => x.what === 'Contorna objeções do cliente')!;
    expect(screen.getByLabelText(/^O quê/)).toHaveValue(f.what);
    expect(screen.getByLabelText(/^Como/)).toHaveValue(f.how);
    expect(screen.getByRole('button', { name: /^Vendas/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', fichaBtn('Contorna objeções do cliente'))).toHaveAttribute('aria-current', 'true');
  });

  it('editar guarda na hora com origem "manual", marca a ficha como editada e conta no resumo', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    await ir(user, /^Vendas/, /Atendimento/, 'Aborda o lead rapidamente');
    const campo = screen.getByLabelText(/^O quê/);
    await user.clear(campo);
    await user.type(campo, 'Aborda o lead pelo WhatsApp');
    const g = guardado(s);
    const id = DOCUMENTO_FICHAS.fichas.find((f) => f.what === 'Aborda o lead rapidamente')!.id;
    expect(g.fpe_edicoes[id]).toMatchObject({ origem: 'manual', campos: { what: 'Aborda o lead pelo WhatsApp' } });
    expect(screen.getByRole('list', { name: 'Resumo' })).toHaveTextContent('1 editada');
    expect(screen.getByRole('button', fichaBtn('Aborda o lead pelo WhatsApp'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Vendas.*1 editadas/ })).toBeInTheDocument();
  });

  it('recarregar mantém a edição (novo mount com o mesmo storage)', async () => {
    const user = userEvent.setup();
    const s = falso();
    const primeira = tela(s);
    await ir(user, /^Vendas/, /Atendimento/, 'Contorna objeções do cliente');
    await user.type(screen.getByLabelText(/^Por quê/), ' EXTRA');
    primeira.unmount();
    tela(s);
    expect(screen.getByRole('list', { name: 'Resumo' })).toHaveTextContent('1 editada');
    await ir(user, /^Vendas/, /Atendimento/, 'Contorna objeções do cliente');
    expect(screen.getByLabelText(/^Por quê/).toString()).toBeDefined();
    expect((screen.getByLabelText(/^Por quê/) as HTMLTextAreaElement).value.endsWith(' EXTRA')).toBe(true);
  });

  it('nenhuma perda ao trocar de setor: edita em Vendas, vai ao Administrativo e volta', async () => {
    const user = userEvent.setup();
    tela(falso());
    await ir(user, /^Vendas/, /Atendimento/, 'Contorna objeções do cliente');
    await user.type(screen.getByLabelText(/^Como/), ' nota');
    await user.click(screen.getByRole('button', { name: /^Administrativo/ }));
    expect(screen.getByRole('button', { name: /^Administrativo/ })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: /^Vendas/ }));
    await user.click(screen.getByRole('button', { name: /Atendimento/ }));
    await user.click(screen.getByRole('button', fichaBtn('Contorna objeções do cliente')));
    expect((screen.getByLabelText(/^Como/) as HTMLTextAreaElement).value.endsWith(' nota')).toBe(true);
  });

  it('Restaurar padrão volta os valores, tira a marca de editada e remove a edição do storage', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    await ir(user, /^Vendas/, /Atendimento/, 'Contorna objeções do cliente');
    const f = DOCUMENTO_FICHAS.fichas.find((x) => x.what === 'Contorna objeções do cliente')!;
    await user.type(screen.getByLabelText(/^Onde/), ' XX');
    expect(Object.keys(guardado(s).fpe_edicoes)).toEqual([f.id]);
    await user.click(screen.getByRole('button', { name: 'Restaurar o padrão da ficha: ' + f.what }));
    expect(screen.getByLabelText(/^Onde/)).toHaveValue(f.where);
    expect(guardado(s).fpe_edicoes).toEqual({});
    expect(screen.getByRole('list', { name: 'Resumo' })).toHaveTextContent('0 editadas');
  });

  it('digitar de volta o texto original desfaz a edição', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    const f = DOCUMENTO_FICHAS.fichas.find((x) => x.setor_id === 'setor_01')!;
    const campo = screen.getByLabelText(/^Quem/);
    await user.type(campo, 'X');
    expect(Object.keys(guardado(s).fpe_edicoes)).toHaveLength(1);
    await user.type(campo, '{Backspace}');
    expect((campo as HTMLTextAreaElement).value).toBe(f.who);
    expect(guardado(s).fpe_edicoes).toEqual({});
  });

  it('campo vazio mostra o que falta, mas o dado não se perde', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    await user.clear(screen.getByLabelText(/^Por quê/));
    expect(await screen.findByText('Informe por quê: o objetivo da ação.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Por quê/)).toHaveAttribute('aria-invalid', 'true');
    expect(Object.values(guardado(s).fpe_edicoes)[0]?.campos.why).toBe('');
  });

  it('funciona com storage vazio, sem storage e com storage que recusa gravar (aviso, sem quebrar)', async () => {
    const user = userEvent.setup();
    const semStorage = tela(null);
    expect(screen.getByRole('status')).toHaveTextContent('Este navegador não deixou guardar');
    await user.type(screen.getByLabelText(/^Quem/), 'X');
    expect(screen.getByRole('list', { name: 'Resumo' })).toHaveTextContent('1 editada');
    semStorage.unmount();
    tela(falso(undefined, { setLanca: true }));
    await user.type(screen.getByLabelText(/^Quem/), 'X');
    expect(screen.getByRole('status')).toHaveTextContent('Este navegador não deixou guardar');
  });
});

describe('fluxograma na tela FPE', () => {
  const svgDaTela = () => document.querySelector('.fluxo svg') as SVGElement;
  /** o gerador quebra o texto em linhas (<text>): junta com espaço para procurar frases. */
  const textoDoSvg = () => [...svgDaTela().querySelectorAll('text')].map((t) => t.textContent).join(' ');

  it('gera o fluxograma do setor com as edições; editar depois avisa que ficou desatualizado; gerar de novo atualiza', async () => {
    const user = userEvent.setup();
    tela(falso());
    await ir(user, /^Vendas/, /Atendimento/, 'Aborda o lead rapidamente');
    await user.click(screen.getByRole('button', { name: /^Gerar fluxograma do setor Vendas/ }));
    expect(screen.getByRole('region', { name: 'Fluxo do setor Vendas' })).toBeInTheDocument();
    expect(textoDoSvg()).toContain('Aborda o lead rapidamente');

    const campo = screen.getByLabelText(/^O quê/);
    await user.clear(campo);
    await user.type(campo, 'Recebe o lead e responde no mesmo dia');
    expect(screen.getByText(/Você editou fichas depois de gerar este fluxograma/)).toBeInTheDocument();
    expect(textoDoSvg()).not.toContain('Recebe o lead e responde');

    await user.click(screen.getByRole('button', { name: /^Gerar fluxograma do setor Vendas/ }));
    expect(textoDoSvg()).toContain('Recebe o lead e responde no mesmo dia');
    expect(textoDoSvg()).not.toContain('Aborda o lead rapidamente');
    expect(screen.queryByText(/Você editou fichas depois/)).not.toBeInTheDocument();
  });

  it('gera o fluxograma geral por fase (a fase sugerida segue o estágio; dá para trocar)', async () => {
    const user = userEvent.setup();
    tela(falso());
    await ir(user, /^Vendas/, /Atendimento/);
    expect(screen.getByLabelText('Fase do fluxograma geral')).toHaveValue('1');
    await user.selectOptions(screen.getByLabelText('Fase do fluxograma geral'), '2');
    await user.click(screen.getByRole('button', { name: 'Gerar fluxograma geral da fase' }));
    expect(screen.getByRole('region', { name: 'Fluxo geral — Fase 2: Técnica/Projeto' })).toBeInTheDocument();
    expect(textoDoSvg()).toContain('Fase 2');
  });

  it('texto sempre escapado: marcação digitada vira texto no SVG e nunca elemento na página', async () => {
    const user = userEvent.setup();
    tela(falso());
    const campo = screen.getByLabelText(/^O quê/);
    await user.clear(campo);
    await user.type(campo, '<img src=x onerror=alert(1)><script>alert(2)</script> & "aspas"');
    await user.click(screen.getByRole('button', { name: /^Gerar fluxograma do setor Marketing/ }));
    const regiao = screen.getByRole('region', { name: 'Fluxo do setor Marketing' });
    expect(regiao.querySelector('img, script')).toBeNull();
    expect(regiao.innerHTML).toContain('&lt;img');
    expect(regiao.textContent).toContain('onerror');
  });

  it('é orientada a dados: fichas e Matriz alteradas mudam a tela (nada fixo no código)', () => {
    const dados = clone(MATRIZ_V08);
    const fichas = clone(DOCUMENTO_FICHAS);
    fichas.fichas = fichas.fichas.filter((f) => f.setor_id !== 'setor_12');
    fichas.fichas[0]!.what = 'Ficha alterada no dado';
    tela(falso(), dados, fichas);
    expect(screen.queryByRole('button', { name: /^Cliente/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^O quê/)).toHaveValue('Ficha alterada no dado');
    expect(within(screen.getByRole('list', { name: 'Resumo' })).getByText(String(fichas.fichas.length))).toBeInTheDocument();
  });
});
