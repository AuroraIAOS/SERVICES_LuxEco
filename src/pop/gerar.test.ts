// @vitest-environment node
// POP por template, sem LLM (03.1): 12 POPs setoriais + 1 geral, sempre com as 11 seções; seção 11 com os 4 itens de docs/06 §5.
import { describe, expect, it } from 'vitest';
import { BIBLIOTECAS } from '../dados/bibliotecas';
import { DOCUMENTO_FICHAS } from '../dados/fichas';
import { MATRIZ_V08 } from '../dados/matriz';
import { PERGUNTAS_POP, POP_OBSERVACOES, POP_TEMPLATES } from '../dados/pop';
import type { PopTemplates } from '../dados/tipos';
import { editarCampo, estadoFpeVazio } from '../estado/armazenamento';
import type { EstadoFpe } from '../estado/armazenamento';
import { montarFpe, valoresPadrao } from '../telas/fpe/modelo';
import type { EntradaPop, Pop } from './gerar';
import { gerarPop, respostaEmVigor, textoDoPop } from './gerar';

const entrada = (extra: Partial<EntradaPop> = {}, estado: EstadoFpe = estadoFpeVazio()): EntradaPop => ({
  v08: MATRIZ_V08,
  fpe: montarFpe(MATRIZ_V08, DOCUMENTO_FICHAS, estado),
  bibliotecas: BIBLIOTECAS,
  perguntas: PERGUNTAS_POP.perguntas,
  templates: POP_TEMPLATES,
  observacoes: POP_OBSERVACOES,
  ...extra,
});

const setorIds = MATRIZ_V08.setores.map((s) => s.id);
const todos: Pop[] = [...setorIds.map((id) => gerarPop({ tipo: 'setor', setorId: id }, entrada())), gerarPop({ tipo: 'geral' }, entrada())];
const secao = (pop: Pop, numero: number) => pop.secoes.find((s) => s.numero === numero)!;
const nomeDoSetor = (id: string) => MATRIZ_V08.setores.find((s) => s.id === id)!.nome;
const popDe = (id: string, e: EntradaPop = entrada()) => gerarPop({ tipo: 'setor', setorId: id }, e);

describe('POP: estrutura fixa', () => {
  it('gera 12 POPs setoriais e 1 geral', () => {
    expect(todos).toHaveLength(13);
    expect(todos.filter((p) => p.escopo === 'setor')).toHaveLength(12);
    expect(todos.filter((p) => p.escopo === 'geral')).toHaveLength(1);
  });

  it.each(todos.map((p) => [p.titulo, p] as const))('%s: 11 seções na ordem do template, nenhuma vazia', (_titulo, pop) => {
    expect(pop.secoes.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(pop.secoes.map((s) => s.titulo)).toEqual(POP_TEMPLATES.secoes.map((s) => s.titulo));
    for (const s of pop.secoes) expect(s.blocos.length, `seção ${s.numero}`).toBeGreaterThan(0);
    expect(pop.secoes[10]!.titulo).toBe('Observações para revisão jurídica');
  });

  it('a seção 11 traz os 4 itens de docs/06 §5 em todos os POPs', () => {
    for (const pop of todos) {
      const s11 = textoDoPop({ ...pop, secoes: [secao(pop, 11)] });
      for (const o of POP_OBSERVACOES.itens) {
        expect(s11, `${pop.titulo} / ${o.id}`).toContain(o.diretriz);
        expect(s11).toContain(o.revisar);
      }
      expect(s11).toContain('boleto');
      expect(s11).toContain('IBS');
      expect(s11).toContain('telhado');
      expect(s11).toContain('não parecer jurídico');
    }
  });

  it('o título do POP setorial e do geral vem do template', () => {
    expect(popDe('setor_02').titulo).toBe('POP — Vendas');
    expect(todos.at(-1)!.titulo).toBe('POP geral — Lux Eco Solutions');
    expect(todos.at(-1)!.setorId).toBeNull();
  });
});

describe('POP: conteúdo vem dos dados', () => {
  it('o procedimento tem um passo por ficha (o geral tem as 236)', () => {
    const passos = (pop: Pop) => secao(pop, 6).blocos.flatMap((b) => (b.tipo === 'passos' ? b.passos : []));
    for (const id of setorIds) {
      const esperado = DOCUMENTO_FICHAS.fichas.filter((f) => f.setor_id === id).length;
      expect(passos(popDe(id)), id).toHaveLength(esperado);
    }
    expect(passos(todos.at(-1)!)).toHaveLength(DOCUMENTO_FICHAS.fichas.length);
  });

  it('cada passo traz Como, Por quê, Onde e Quando das fichas', () => {
    const passo = secao(popDe('setor_11'), 6).blocos.flatMap((b) => (b.tipo === 'passos' ? b.passos : []))[0]!;
    expect(passo.texto).toBe('Realiza a vistoria técnica externa');
    expect(passo.detalhes.map((d) => d.rotulo)).toEqual(['Como', 'Por quê', 'Onde', 'Quando']);
  });

  it('a abrangência lista só os estágios em que o setor tem ação', () => {
    const lista = secao(popDe('setor_09'), 2).blocos.find((b) => b.tipo === 'lista');
    expect(lista && lista.tipo === 'lista' ? lista.itens : []).toEqual([
      'Est. 14 — Compra de material (Técnica/Projeto) — 2 ações',
      'Est. 15 — Entrega de material (Execução) — 2 ações',
    ]);
  });

  it('as condicionais aparecem em tabela; setor sem IF/ELSE diz o que fazer', () => {
    const tabela = (id: string) => secao(popDe(id), 7).blocos.find((b) => b.tipo === 'tabela');
    const vendas = tabela('setor_02');
    expect(vendas && vendas.tipo === 'tabela' ? vendas.linhas : []).toHaveLength(MATRIZ_V08.condicionais.filter((c) => c.acao_id.startsWith('acao_02_')).length);
    expect(tabela('setor_01')).toBeUndefined();
    expect(textoDoPop(popDe('setor_01'))).toContain('O setor não tem decisão IF/ELSE na Matriz');
  });

  it('as métricas trazem os KPIs do setor com meta “a definir” e o formulário com a meta em branco', () => {
    const tabelas = secao(popDe('setor_11'), 9).blocos.filter((b) => b.tipo === 'tabela');
    const kpis = BIBLIOTECAS.kpis.filter((k) => k.setor_id === 'setor_11');
    expect(tabelas).toHaveLength(2);
    const [indicadores, formulario] = tabelas as Extract<(typeof tabelas)[number], { tipo: 'tabela' }>[];
    expect(indicadores!.linhas).toHaveLength(kpis.length);
    expect(indicadores!.linhas.every((l) => l[3] === 'A definir pela Lux')).toBe(true);
    expect(formulario!.colunas).toEqual(['Indicador', 'Período', 'Meta', 'Realizado', 'Responsável (função)', 'Observações']);
    expect(formulario!.linhas.every((l) => l[2] === '' && l[3] === '')).toBe(true);
    expect(textoDoPop(popDe('setor_11'))).toContain('a Lux não controla este setor');
  });

  it('as ferramentas mostram a situação; o CRM próprio aparece como futuro e fora do escopo', () => {
    const t = textoDoPop(popDe('setor_03'));
    expect(t).toContain('WhatsApp — Grupo de Fluxo — canal temporário');
    expect(t).toContain('CRM próprio da Lux — futura, fora do escopo deste projeto');
    expect(textoDoPop(popDe('setor_05'))).toContain('Nenhuma ferramenta específica do setor consta na biblioteca');
  });

  it('as equipes terceirizadas aparecem nos Responsáveis da Equipe Técnica', () => {
    const t = textoDoPop({ ...popDe('setor_10'), secoes: [secao(popDe('setor_10'), 3)] });
    expect(t).toContain('Lavras — Tiago/Illumini');
    expect(t).toContain('Passos — Odirley/Lumines');
  });

  it('o glossário só traz termos que o setor usa', () => {
    const defs = (id: string) => textoDoPop({ ...popDe(id), secoes: [secao(popDe(id), 4)] });
    expect(defs('setor_05')).toContain('ICMS e ISSQN');
    expect(defs('setor_09')).toContain('ICMS e ISSQN'); // a ficha “Emite as guias de translado” cita o ICMS
    expect(defs('setor_01')).not.toContain('ICMS e ISSQN');
    expect(defs('setor_02')).toContain('Energia por Assinatura');
    expect(defs('setor_01')).toContain('Estágio:');
  });

  it('Vendas e CEO reproduzem as respostas-padrão do CEO; as sujeitas à revisão levam a marca', () => {
    for (const id of ['setor_02', 'setor_06']) {
      const s6 = textoDoPop({ ...popDe(id), secoes: [secao(popDe(id), 6)] });
      for (const r of MATRIZ_V08.respostas_padrao) expect(s6, `${id} ${r.id}`).toContain(r.texto);
      expect(s6).toContain('Formas de pagamento: A Lux disponibiliza');
      expect(s6).toContain('(sujeita à revisão jurídica)');
    }
    expect(textoDoPop({ ...popDe('setor_09'), secoes: [secao(popDe('setor_09'), 6)] })).not.toContain('Respostas-padrão de atendimento');
  });

  it('o texto do POP não traz cifra em R$, prazo numérico nem selo de proveniência', () => {
    for (const pop of todos) {
      const t = textoDoPop(pop);
      expect(t, pop.titulo).not.toMatch(/R\$\s*\d/);
      expect(t).not.toMatch(/\b\d+\s*(?:dias?|horas?|minutos?|semanas?|meses|mês)\b/i);
      expect(t).not.toMatch(/\b(documentado|sugerido)\b/i);
      expect(t).not.toMatch(/\bLuan\b/);
    }
  });
});

describe('POP: respostas das perguntas estratégicas', () => {
  const p = PERGUNTAS_POP.perguntas.find((x) => x.id === 'perg_02_4')!;
  const s5 = (pop: Pop) => textoDoPop({ ...pop, secoes: [secao(pop, 5)] });

  it('sem edição vale a resposta-padrão, na seção da pergunta', () => {
    expect(p.secao).toBe(5);
    expect(s5(popDe('setor_02'))).toContain(p.resposta_padrao);
    expect(s5(popDe('setor_02'))).toContain(p.pergunta);
  });

  it('a resposta editada substitui a padrão; a do POP geral também', () => {
    const editada = { [p.id]: 'Confirma nome e telefone antes de qualquer simulação.' };
    expect(s5(popDe('setor_02', entrada({ respostas: editada })))).toContain(editada[p.id]);
    expect(s5(popDe('setor_02', entrada({ respostas: editada })))).not.toContain(p.resposta_padrao);
    expect(s5(gerarPop({ tipo: 'geral' }, entrada({ respostas: editada })))).toContain(editada[p.id]);
  });

  it('resposta apagada não entra no POP (nada é inventado no lugar)', () => {
    const pop = popDe('setor_02', entrada({ respostas: { [p.id]: '   ' } }));
    expect(s5(pop)).not.toContain(p.pergunta);
    expect(respostaEmVigor(p, { [p.id]: '  ' })).toBe('');
  });

  it('as respostas de outro setor não vazam para o POP do setor', () => {
    expect(textoDoPop(popDe('setor_09'))).not.toContain(p.pergunta);
  });

  it('todo setor tem ≥ 8 perguntas e cada seção alimentável recebe resposta no seu POP', () => {
    for (const id of setorIds) {
      const dele = PERGUNTAS_POP.perguntas.filter((x) => x.setor_id === id);
      expect(dele.length, id).toBeGreaterThanOrEqual(8);
      const pop = popDe(id);
      for (const numero of PERGUNTAS_POP.meta.secoes_alimentadas) {
        expect(secao(pop, numero).blocos.some((b) => b.tipo === 'respostas'), `${id} seção ${numero}`).toBe(true);
      }
    }
  });
});

describe('POP: edições do FPE seguem para o POP', () => {
  it('o texto editado da ficha aparece no procedimento (valores em vigor)', () => {
    const ficha = DOCUMENTO_FICHAS.fichas.find((f) => f.setor_id === 'setor_11')!;
    const estado = editarCampo(estadoFpeVazio(), ficha.id, valoresPadrao(ficha), 'how', 'Vistoria feita conforme o roteiro da concessionária.', '2026-09-25T12:00:00.000Z');
    expect(textoDoPop(popDe('setor_11', entrada({}, estado)))).toContain('Vistoria feita conforme o roteiro da concessionária.');
    expect(textoDoPop(popDe('setor_11'))).not.toContain('roteiro da concessionária');
  });

  it('campo vazio não vira linha em branco no POP', () => {
    const ficha = DOCUMENTO_FICHAS.fichas.find((f) => f.setor_id === 'setor_11')!;
    const estado = editarCampo(estadoFpeVazio(), ficha.id, valoresPadrao(ficha), 'why', '', '2026-09-25T12:00:00.000Z');
    const passo = secao(popDe('setor_11', entrada({}, estado)), 6).blocos.flatMap((b) => (b.tipo === 'passos' ? b.passos : []))[0]!;
    expect(passo.detalhes.map((d) => d.rotulo)).toEqual(['Como', 'Onde', 'Quando']);
  });
});

describe('POP: o gerador recusa o que está errado (sensibilidade)', () => {
  it('setor inexistente', () => {
    expect(() => gerarPop({ tipo: 'setor', setorId: 'setor_99' }, entrada())).toThrow(/sem fichas/);
  });

  it('texto do template com chave que o gerador não informa', () => {
    const templates: PopTemplates = { ...POP_TEMPLATES, textos: { ...POP_TEMPLATES.textos, objetivo_setorial: 'Objetivo de {desconhecido}.' } };
    expect(() => popDe('setor_02', entrada({ templates }))).toThrow(/\{desconhecido\}/);
  });

  it('texto do template ausente', () => {
    const { titulo_setorial: _removido, ...resto } = POP_TEMPLATES.textos;
    expect(() => popDe('setor_02', entrada({ templates: { ...POP_TEMPLATES, textos: resto } }))).toThrow(/titulo_setorial/);
  });

  it('seção do template sem gerador', () => {
    const templates: PopTemplates = { ...POP_TEMPLATES, secoes: [...POP_TEMPLATES.secoes, { numero: 12, chave: 'inventada', titulo: 'Inventada' }] };
    expect(() => popDe('setor_02', entrada({ templates }))).toThrow(/inventada/);
  });

  it('sem a observação jurídica, a seção 11 perde o item (o validador de dados o acusa)', () => {
    const observacoes = { ...POP_OBSERVACOES, itens: POP_OBSERVACOES.itens.slice(0, 3) };
    const s11 = (o: typeof POP_OBSERVACOES) => textoDoPop({ ...popDe('setor_02', entrada({ observacoes: o })), secoes: [secao(popDe('setor_02', entrada({ observacoes: o })), 11)] });
    expect(s11(observacoes)).not.toContain('telhado');
    expect(s11(POP_OBSERVACOES)).toContain('protege o telhado');
  });

  it('o nome do setor no título acompanha o dado', () => {
    for (const id of setorIds) expect(popDe(id).titulo).toBe(`POP — ${nomeDoSetor(id)}`);
  });
});
