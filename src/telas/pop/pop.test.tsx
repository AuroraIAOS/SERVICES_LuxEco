import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DOCUMENTO_FICHAS } from '../../dados/fichas';
import { MATRIZ_V08 } from '../../dados/matriz';
import { PERGUNTAS_POP } from '../../dados/pop';
import { CHAVE_FPE, editarCampo, estadoFpeVazio } from '../../estado/armazenamento';
import type { ArmazenamentoTexto } from '../../estado/armazenamento';
import { CHAVE_POP } from '../../estado/pop';
import type { EstadoPop } from '../../estado/pop';
import { valoresPadrao } from '../fpe/modelo';
import { TelaPop } from './TelaPop';

function falso(opcoes: { setLanca?: boolean; inicial?: Record<string, string> } = {}): ArmazenamentoTexto & { dados: Map<string, string> } {
  const dados = new Map<string, string>(Object.entries(opcoes.inicial ?? {}));
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => {
      if (opcoes.setLanca) throw new DOMException('cota', 'QuotaExceededError');
      dados.set(k, v);
    },
  };
}
const guardado = (s: { dados: Map<string, string> }): EstadoPop | null => {
  const bruto = s.dados.get(CHAVE_POP);
  return bruto ? (JSON.parse(bruto) as EstadoPop) : null;
};

const tela = (armazenamento: ArmazenamentoTexto | null) =>
  render(
    <MemoryRouter>
      <TelaPop armazenamento={armazenamento} />
    </MemoryRouter>,
  );

const perguntasDe = (setorId: string) => PERGUNTAS_POP.perguntas.filter((p) => p.setor_id === setorId);
const campo = (pergunta: string) => screen.getByRole('textbox', { name: pergunta }) as HTMLTextAreaElement;

describe('tela POP', () => {
  it('abre no primeiro setor com as perguntas e as respostas-padrão pré-preenchidas', () => {
    tela(falso());
    expect(screen.getByRole('heading', { level: 1, name: 'POP' })).toBeInTheDocument();
    const marketing = perguntasDe('setor_01');
    expect(marketing.length).toBeGreaterThanOrEqual(8);
    for (const p of marketing) expect(campo(p.pergunta).value).toBe(p.resposta_padrao);
    expect(screen.getAllByRole('textbox')).toHaveLength(marketing.length);
  });

  it('o resumo mostra números calculados dos dados', () => {
    tela(falso());
    const resumo = screen.getByRole('list', { name: 'Resumo' });
    expect(within(resumo).getByText(String(MATRIZ_V08.setores.length))).toBeInTheDocument();
    expect(within(resumo).getByText(String(PERGUNTAS_POP.perguntas.length))).toBeInTheDocument();
    expect(within(resumo).getByText('seções por POP').parentElement?.textContent).toContain('11');
  });

  it('um chip por setor; trocar de setor mostra as perguntas dele', async () => {
    const user = userEvent.setup();
    tela(falso());
    const chips = within(screen.getByRole('navigation', { name: 'Escolha do setor' })).getAllByRole('button');
    expect(chips).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: 'Cemig' }));
    expect(screen.getByRole('button', { name: 'Cemig' })).toHaveAttribute('aria-current', 'true');
    for (const p of perguntasDe('setor_11')) expect(campo(p.pergunta).value).toBe(p.resposta_padrao);
  });

  it('cada digitação é guardada na hora e sobrevive à troca de setor', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    const p = perguntasDe('setor_01')[0]!;
    await user.clear(campo(p.pergunta));
    await user.type(campo(p.pergunta), 'Objetivo revisado pelo CEO.');
    expect(guardado(s)?.pop_respostas[p.id]?.texto).toBe('Objetivo revisado pelo CEO.');
    await user.click(screen.getByRole('button', { name: 'Vendas' }));
    await user.click(screen.getByRole('button', { name: 'Marketing' }));
    expect(campo(p.pergunta).value).toBe('Objetivo revisado pelo CEO.');
  });

  it('“Restaurar resposta-padrão” volta ao texto original e limpa a edição guardada', async () => {
    const user = userEvent.setup();
    const s = falso();
    tela(s);
    const p = perguntasDe('setor_01')[0]!;
    const restaurar = screen.getByRole('button', { name: `Restaurar a resposta-padrão: ${p.pergunta}` });
    expect(restaurar).toBeDisabled();
    await user.type(campo(p.pergunta), ' Mais um trecho.');
    expect(restaurar).toBeEnabled();
    await user.click(restaurar);
    expect(campo(p.pergunta).value).toBe(p.resposta_padrao);
    expect(guardado(s)?.pop_respostas ?? {}).toEqual({});
  });

  it('resposta apagada avisa que a pergunta não entra no POP', async () => {
    const user = userEvent.setup();
    tela(falso());
    const p = perguntasDe('setor_01')[0]!;
    await user.clear(campo(p.pergunta));
    expect(screen.getByRole('alert')).toHaveTextContent('Sem resposta: esta pergunta não entra no POP.');
  });

  it('lê as respostas já guardadas ao abrir', () => {
    const p = perguntasDe('setor_01')[0]!;
    const inicial: EstadoPop = { schema_versao: 1, pop_respostas: { [p.id]: { texto: 'Resposta de outra sessão.', origem: 'manual', atualizado_em: '2026-09-25T10:00:00.000Z' } } };
    tela(falso({ inicial: { [CHAVE_POP]: JSON.stringify(inicial) } }));
    expect(campo(p.pergunta).value).toBe('Resposta de outra sessão.');
  });

  it('sem storage ou com storage que recusa, a tela funciona e avisa', async () => {
    const user = userEvent.setup();
    tela(null);
    expect(screen.getByRole('status')).toHaveTextContent('Este navegador não deixou guardar as suas respostas');
    const p = perguntasDe('setor_01')[0]!;
    await user.type(campo(p.pergunta), ' ok');
    expect(campo(p.pergunta).value).toBe(`${p.resposta_padrao} ok`);
  });
});

describe('geração do POP na tela', () => {
  it('antes de gerar não há POP; o botão do setor leva o nome do setor', () => {
    tela(falso());
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar POP do setor Marketing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar POP geral' })).toBeInTheDocument();
  });

  it('gera o POP do setor com as 11 seções, a 11 por último', async () => {
    const user = userEvent.setup();
    tela(falso());
    await user.click(screen.getByRole('button', { name: 'Vendas' }));
    await user.click(screen.getByRole('button', { name: 'Gerar POP do setor Vendas' }));
    const pop = screen.getByRole('article', { name: 'POP — Vendas' });
    const secoes = within(pop).getAllByRole('heading', { level: 3 });
    expect(secoes).toHaveLength(11);
    expect(secoes[0]).toHaveTextContent('Objetivo');
    expect(secoes[10]).toHaveTextContent('Observações para revisão jurídica');
    expect(document.activeElement).toBe(pop.parentElement);
  });

  it('a resposta editada aparece no POP gerado; a seção 1 já vem aberta', async () => {
    const user = userEvent.setup();
    tela(falso());
    const p = perguntasDe('setor_01').find((x) => x.secao === 1)!;
    await user.clear(campo(p.pergunta));
    await user.type(campo(p.pergunta), 'Gerar leads bons para Vendas.');
    await user.click(screen.getByRole('button', { name: 'Gerar POP do setor Marketing' }));
    const pop = screen.getByRole('article', { name: 'POP — Marketing' });
    expect(within(pop).getByText('Gerar leads bons para Vendas.')).toBeVisible();
    expect(within(pop).getByText('Funções do setor')).toBeVisible();
  });

  it('gera o POP geral', async () => {
    const user = userEvent.setup();
    tela(falso());
    await user.click(screen.getByRole('button', { name: 'Gerar POP geral' }));
    const pop = screen.getByRole('article', { name: 'POP geral — Lux Eco Solutions' });
    expect(within(pop).getAllByRole('heading', { level: 3 })).toHaveLength(11);
  });

  it('“Abrir todas” abre as 11 seções e o botão passa a fechar', async () => {
    const user = userEvent.setup();
    tela(falso());
    await user.click(screen.getByRole('button', { name: 'Gerar POP do setor Marketing' }));
    await user.click(screen.getByRole('button', { name: 'Abrir todas as seções' }));
    const pop = screen.getByRole('article');
    expect(within(pop).getAllByRole('button', { expanded: true })).toHaveLength(11); // as 11 seções (o botão “Fechar” não tem aria-expanded)
    await user.click(screen.getByRole('button', { name: 'Fechar todas as seções' }));
    expect(within(pop).queryAllByRole('button', { expanded: true })).toHaveLength(0);
  });

  it('a seção 11 mostra os 4 itens de revisão jurídica e o aviso', async () => {
    const user = userEvent.setup();
    tela(falso());
    await user.click(screen.getByRole('button', { name: 'Gerar POP do setor Marketing' }));
    await user.click(screen.getByRole('button', { name: /Observações para revisão jurídica/ }));
    const regiao = screen.getByRole('region', { name: /Observações para revisão jurídica/ });
    expect(within(regiao).getAllByRole('listitem')).toHaveLength(4);
    expect(within(regiao).getByRole('note')).toHaveTextContent('não parecer jurídico');
  });

  it('mudar uma resposta depois de gerar marca o POP como desatualizado', async () => {
    const user = userEvent.setup();
    tela(falso());
    await user.click(screen.getByRole('button', { name: 'Gerar POP do setor Marketing' }));
    expect(screen.queryByText(/Gere de novo/)).not.toBeInTheDocument();
    await user.type(campo(perguntasDe('setor_01')[0]!.pergunta), ' a mais');
    expect(screen.getByRole('status')).toHaveTextContent('Gere de novo');
    await user.click(screen.getByRole('button', { name: 'Gerar POP do setor Marketing' }));
    expect(screen.queryByText(/Gere de novo/)).not.toBeInTheDocument();
  });

  it('as edições do FPE guardadas aparecem no procedimento do POP', async () => {
    const user = userEvent.setup();
    const ficha = DOCUMENTO_FICHAS.fichas.find((f) => f.setor_id === 'setor_11')!;
    const fpe = editarCampo(estadoFpeVazio(), ficha.id, valoresPadrao(ficha), 'how', 'Vistoria feita pelo roteiro da concessionária.', '2026-09-25T12:00:00.000Z');
    tela(falso({ inicial: { [CHAVE_FPE]: JSON.stringify(fpe) } }));
    await user.click(screen.getByRole('button', { name: 'Cemig' }));
    await user.click(screen.getByRole('button', { name: 'Gerar POP do setor Cemig' }));
    await user.click(screen.getByRole('button', { name: /Procedimento/ }));
    expect(screen.getByText('Vistoria feita pelo roteiro da concessionária.')).toBeVisible();
  });
});
