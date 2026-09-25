// @vitest-environment node
// Validação dos dados do POP (03.1): perguntas, template de 11 seções e observações jurídicas. Cada mutação prova que o validador acusa o erro.
import { describe, expect, it } from 'vitest';
import { validarPop } from '../../scripts/validar_dados.ts';
import { PERGUNTAS_POP, POP_OBSERVACOES, POP_TEMPLATES } from './pop.ts';
import { MATRIZ_V08 } from './matriz.ts';
import type { DocumentoPerguntasPop, ObservacoesJuridicasPop, PopTemplates } from './tipos.ts';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const erros = (p: DocumentoPerguntasPop = PERGUNTAS_POP, t: PopTemplates = POP_TEMPLATES, o: ObservacoesJuridicasPop = POP_OBSERVACOES) => validarPop(MATRIZ_V08, p, t, o);

describe('validarPop: dados reais', () => {
  it('os dados versionados passam sem erro', () => {
    expect(erros()).toEqual([]);
  });

  it('tem ≥ 8 perguntas por setor e as 11 seções', () => {
    for (const s of MATRIZ_V08.setores) expect(PERGUNTAS_POP.perguntas.filter((p) => p.setor_id === s.id).length).toBeGreaterThanOrEqual(8);
    expect(POP_TEMPLATES.secoes).toHaveLength(11);
    expect(POP_TEMPLATES.secoes.at(-1)?.chave).toBe('revisao_juridica');
  });
});

describe('validarPop: perguntas (sensibilidade)', () => {
  it('setor com menos de 8 perguntas', () => {
    const p = clone(PERGUNTAS_POP);
    p.perguntas = p.perguntas.filter((x) => x.id !== 'perg_09_9' && x.id !== 'perg_09_8');
    expect(erros(p).join('\n')).toMatch(/Logística tem 7/);
  });

  it('seção do POP sem pergunta no setor', () => {
    const p = clone(PERGUNTAS_POP);
    p.perguntas = p.perguntas.map((x) => (x.id === 'perg_01_9' ? { ...x, secao: 9 as const } : x));
    expect(erros(p).join('\n')).toMatch(/Marketing não tem pergunta para a seção 10/);
  });

  it('resposta-padrão vazia', () => {
    const p = clone(PERGUNTAS_POP);
    p.perguntas[0]!.resposta_padrao = '  ';
    expect(erros(p).join('\n')).toMatch(/perg_01_1: resposta_padrao vazio/);
  });

  it('resposta com R$ ou prazo numérico', () => {
    const p = clone(PERGUNTAS_POP);
    p.perguntas[0]!.resposta_padrao = 'Responde em 2 dias úteis.';
    expect(erros(p).join('\n')).toMatch(/perg_01_1.resposta_padrao traz cifra em R\$ ou prazo numérico/);
    p.perguntas[0]!.resposta_padrao = 'Custa R$ 50 por lead.';
    expect(erros(p).join('\n')).toMatch(/traz cifra/);
  });

  it('pessoa interna da Lux', () => {
    const p = clone(PERGUNTAS_POP);
    p.perguntas[0]!.resposta_padrao = 'Luan aprova as campanhas.';
    expect(erros(p).join('\n')).toMatch(/cita pessoa interna/);
  });

  it('id duplicado, id fora do padrão e id de outro setor', () => {
    const p = clone(PERGUNTAS_POP);
    p.perguntas[1]!.id = 'perg_01_1';
    expect(erros(p).join('\n')).toMatch(/ids duplicados: perg_01_1/);
    const q = clone(PERGUNTAS_POP);
    q.perguntas[0]!.id = 'pergunta1';
    expect(erros(q).join('\n')).toMatch(/fora do padrão/);
    const r = clone(PERGUNTAS_POP);
    r.perguntas[0]!.setor_id = 'setor_02';
    expect(erros(r).join('\n')).toMatch(/o id não corresponde ao setor setor_02/);
  });

  it('seção que nenhuma pergunta alimenta, origem inválida e setor inexistente', () => {
    const p = clone(PERGUNTAS_POP);
    (p.perguntas[0] as { secao: number }).secao = 4;
    expect(erros(p).join('\n')).toMatch(/seção 4 não é alimentada/);
    const q = clone(PERGUNTAS_POP);
    (q.perguntas[0] as { origem: string }).origem = 'manual';
    expect(erros(q).join('\n')).toMatch(/origem deve ser documentado ou sugerido/);
    const r = clone(PERGUNTAS_POP);
    r.perguntas[0]!.setor_id = 'setor_99';
    expect(erros(r).join('\n')).toMatch(/setor "setor_99" inexistente/);
  });

  it('texto longo demais (o POP tem de ser curto)', () => {
    const p = clone(PERGUNTAS_POP);
    p.perguntas[0]!.resposta_padrao = 'a'.repeat(801);
    expect(erros(p).join('\n')).toMatch(/acima de 800 caracteres/);
  });
});

describe('validarPop: template e seção 11 (sensibilidade)', () => {
  it('menos de 11 seções', () => {
    const t = clone(POP_TEMPLATES);
    t.secoes = t.secoes.slice(0, 10);
    expect(erros(PERGUNTAS_POP, t).join('\n')).toMatch(/10 seções, o POP tem 11/);
  });

  it('seção 11 fora do fim ou com outro título', () => {
    const t = clone(POP_TEMPLATES);
    t.secoes[10]!.titulo = 'Anexos';
    expect(erros(PERGUNTAS_POP, t).join('\n')).toMatch(/a seção 11 deve ser “Observações para revisão jurídica”/);
    const u = clone(POP_TEMPLATES);
    [u.secoes[9]!, u.secoes[10]!] = [u.secoes[10]!, u.secoes[9]!];
    expect(erros(PERGUNTAS_POP, u).join('\n')).toMatch(/seção 11 deve ser|numero/);
  });

  it('texto do template com chave desconhecida ou prazo numérico', () => {
    const t = clone(POP_TEMPLATES);
    t.textos.objetivo_setorial = 'Objetivo de {desconhecido}.';
    expect(erros(PERGUNTAS_POP, t).join('\n')).toMatch(/usa \{desconhecido\}/);
    const u = clone(POP_TEMPLATES);
    u.textos.meta_a_definir = 'Em 5 dias';
    expect(erros(PERGUNTAS_POP, u).join('\n')).toMatch(/traz cifra em R\$ ou prazo/);
  });

  it('glossário com regex inválida', () => {
    const t = clone(POP_TEMPLATES);
    t.glossario[0]!.busca = '(';
    expect(erros(PERGUNTAS_POP, t).join('\n')).toMatch(/expressão regular válida/);
  });

  it('observação jurídica removida, alterada ou sem aviso', () => {
    const o = clone(POP_OBSERVACOES);
    o.itens = o.itens.slice(0, 3);
    expect(erros(PERGUNTAS_POP, POP_TEMPLATES, o).join('\n')).toMatch(/3 itens, o docs\/06 §5 exige 4/);
    const p = clone(POP_OBSERVACOES);
    p.itens[2]!.diretriz = 'Afirmação sobre credenciamento.';
    expect(erros(PERGUNTAS_POP, POP_TEMPLATES, p).join('\n')).toMatch(/obs_03 deve reproduzir a diretriz sobre “IBS”/);
    const q = clone(POP_OBSERVACOES);
    q.aviso = '';
    expect(erros(PERGUNTAS_POP, POP_TEMPLATES, q).join('\n')).toMatch(/falta o aviso/);
  });
});
