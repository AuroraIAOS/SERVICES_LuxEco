// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { JSON_V08 } from '../../scripts/compor_v08.ts';
import type { Bibliotecas } from '../../scripts/validar_dados.ts';
import { validarBibliotecas } from '../../scripts/validar_dados.ts';
import type { Documento, Ferramenta, Investimento, Kpi, MatrizV08 } from './tipos.ts';

const RAIZ = resolve(import.meta.dirname, '../..');
const ler = <T,>(caminho: string): T => JSON.parse(readFileSync(caminho, 'utf8')) as T;
const clone = <T,>(x: T): T => structuredClone(x);
const conteudo = (nome: string) => resolve(RAIZ, 'data/conteudo', nome);

let v08: MatrizV08;
let b: Bibliotecas;

beforeAll(() => {
  v08 = ler<MatrizV08>(JSON_V08);
  b = {
    documentos: ler<{ documentos: Documento[] }>(conteudo('documentos.json')).documentos,
    ferramentas: ler<{ ferramentas: Ferramenta[] }>(conteudo('ferramentas.json')).ferramentas,
    investimentos: ler<{ investimentos: Investimento[] }>(conteudo('investimentos.json')).investimentos,
    kpis: ler<{ kpis: Kpi[] }>(conteudo('kpis.json')).kpis,
  };
});

const erros = (x: Bibliotecas = b) => validarBibliotecas(v08, x);

describe('Bibliotecas (documentos, ferramentas, investimentos, KPIs)', () => {
  it('passam em todas as regras (6, 7 e integridade) sem nenhum erro', () => {
    expect(erros()).toEqual([]);
  });

  it('regra 6: nenhum valor em R$ nos investimentos (só categorias) e nenhuma meta nos KPIs', () => {
    expect(b.investimentos.length).toBeGreaterThan(0);
    expect(b.investimentos.every((i) => i.valor_estimado_brl === null)).toBe(true);
    expect(b.kpis.every((k) => k.meta === null)).toBe(true);
  });

  it('regra 7: os 12 setores têm ≥ 1 KPI de produtividade e ≥ 1 de eficiência (inclusive Cemig e Cliente)', () => {
    expect(v08.setores).toHaveLength(12);
    for (const s of v08.setores) {
      for (const tipo of ['produtividade', 'eficiencia'] as const) {
        expect(b.kpis.some((k) => k.setor_id === s.id && k.tipo === tipo), `${s.nome} — ${tipo}`).toBe(true);
      }
    }
    expect(b.kpis.filter((k) => k.tipo === 'produtividade').length).toBeGreaterThanOrEqual(12);
    expect(b.kpis.filter((k) => k.tipo === 'eficiencia').length).toBeGreaterThanOrEqual(12);
  });

  it('KPIs de Cemig e Cliente são indicadores de acompanhamento; os demais não', () => {
    for (const k of b.kpis) expect(Boolean(k.acompanhamento), k.id).toBe(['setor_11', 'setor_12'].includes(k.setor_id));
  });

  it('cada KPI tem o formulário de monitoramento (indicador, período, meta, realizado, responsável, observações) e fórmula de uma linha', () => {
    for (const k of b.kpis) {
      expect(k.formulario, k.id).toEqual(['indicador', 'periodo', 'meta', 'realizado', 'responsavel', 'observacoes']);
      expect(k.formula_descricao.includes('\n'), k.id).toBe(false);
      expect(k.nome.length, k.id).toBeLessThanOrEqual(60);
    }
  });

  it('todos os KPIs são sugeridos e apontam a ação da Matriz que os sustenta', () => {
    expect(b.kpis.every((k) => k.origem === 'sugerido' && k.fundamento.trim() !== '')).toBe(true);
  });

  it('documentos: os 13 tipos citados em docs/06 §4 existem como documentado e o CAT vem da Engenharia', () => {
    const doc = (re: RegExp) => b.documentos.find((d) => d.origem === 'documentado' && re.test(d.nome));
    for (const re of [/conta de energia/i, /simulação de consumo/i, /proposta comercial/i, /contrato digital/i, /ordem de compra/i, /guias de translado/i, /projeto técnico/i, /^CAT$/, /laudo de vistoria/i, /comprovante de treinamento/i, /pedido de ligação/i, /parecer de inviabilidade/i, /parecer da cemig/i]) {
      expect(doc(re), String(re)).toBeDefined();
    }
    expect(doc(/^CAT$/)?.setor_ids).toContain('setor_07');
  });

  it('documentos e ferramentas: documentado traz fonte existente; sugerido traz justificativa', () => {
    for (const x of [...b.documentos, ...b.ferramentas, ...b.investimentos]) {
      if (x.origem === 'documentado') expect(x.fontes?.length, x.id).toBeGreaterThan(0);
      if (x.origem === 'sugerido') expect(x.justificativa?.trim(), x.id).toBeTruthy();
    }
    expect(b.documentos.filter((d) => d.origem === 'sugerido').length).toBeGreaterThan(0);
  });

  it('ferramentas documentadas: WhatsApp (temporário), Google Ads, plataformas financeiras, cartão até 21x; CRM é futuro e fora do escopo', () => {
    const f = (re: RegExp) => b.ferramentas.find((x) => re.test(x.nome));
    expect(f(/whatsapp/i)?.situacao).toBe('temporaria');
    expect(f(/google ads/i)?.origem).toBe('documentado');
    expect(f(/plataformas financeiras/i)?.origem).toBe('documentado');
    expect(f(/cartão/i)?.observacao).toContain('21 vezes');
    expect(f(/crm próprio/i)?.situacao).toBe('futura');
    expect(f(/crm próprio/i)?.observacao).toContain('fora do escopo');
  });

  it('nada nas bibliotecas traz cifra em R$ nem prazo numérico (SLA)', () => {
    const json = JSON.stringify(b);
    expect(json).not.toMatch(/R\$/);
    expect(json).not.toMatch(/\b\d+\s*(?:dias?|horas?|minutos?|semanas?|meses|mês)\b/i);
  });

  it('as referências de setor e estágio existem na V08', () => {
    const setores = new Set(v08.setores.map((s) => s.id));
    const estagios = new Set(v08.estagios.map((e) => e.id));
    for (const d of b.documentos) {
      expect(d.setor_ids.every((s) => setores.has(s)), d.id).toBe(true);
      expect(d.estagio_ids.every((e) => estagios.has(e)), d.id).toBe(true);
    }
  });
});

describe('validarBibliotecas detecta erro (sensibilidade)', () => {
  it('valor em R$ num investimento e meta num KPI (regra 6)', () => {
    const a = clone(b);
    (a.investimentos[0] as { valor_estimado_brl: unknown }).valor_estimado_brl = 1000;
    expect(erros(a).some((e) => e.includes('Regra 6') && e.includes(a.investimentos[0]!.id))).toBe(true);
    const c = clone(b);
    (c.kpis[0] as { meta: unknown }).meta = 10;
    expect(erros(c).some((e) => e.includes('Regra 6') && e.includes(c.kpis[0]!.id))).toBe(true);
  });

  it('setor sem KPI de um dos tipos (regra 7)', () => {
    const a = clone(b);
    a.kpis = a.kpis.filter((k) => !(k.setor_id === 'setor_09' && k.tipo === 'eficiencia'));
    expect(erros(a).some((e) => e.includes('Regra 7') && e.includes('Logística') && e.includes('eficiencia'))).toBe(true);
    const c = clone(b);
    c.kpis = c.kpis.filter((k) => k.setor_id !== 'setor_11');
    expect(erros(c).filter((e) => e.includes('Regra 7') && e.includes('Cemig'))).toHaveLength(2);
  });

  it('documentado sem fontes, com fonte inexistente, e sugerido sem justificativa', () => {
    const a = clone(b);
    delete a.documentos[0]!.fontes;
    expect(erros(a).some((e) => e.includes('documentado sem fontes'))).toBe(true);
    const c = clone(b);
    c.documentos[0]!.fontes![0]!.arquivo = 'data/fontes/nao_existe.md';
    expect(erros(c).some((e) => e.includes('não existe'))).toBe(true);
    const d = clone(b);
    const sug = d.documentos.find((x) => x.origem === 'sugerido')!;
    delete sug.justificativa;
    expect(erros(d).some((e) => e.includes('sugerido sem justificativa'))).toBe(true);
  });

  it('documento obrigatório removido (ex.: CAT) e ferramenta obrigatória removida', () => {
    const a = clone(b);
    a.documentos = a.documentos.filter((d) => d.nome !== 'CAT');
    expect(erros(a).some((e) => e.includes('“CAT”'))).toBe(true);
    const c = clone(b);
    c.ferramentas = c.ferramentas.filter((f) => !/google ads/i.test(f.nome));
    expect(erros(c).some((e) => e.includes('Google Ads'))).toBe(true);
  });

  it('referência a setor ou estágio inexistente', () => {
    const a = clone(b);
    a.documentos[0]!.setor_ids = ['setor_99'];
    expect(erros(a).some((e) => e.includes('setor "setor_99" inexistente'))).toBe(true);
    const c = clone(b);
    c.documentos[0]!.estagio_ids = [99];
    expect(erros(c).some((e) => e.includes('estágio 99 inexistente'))).toBe(true);
  });

  it('fórmula com quebra de linha, nome longo e formulário incompleto', () => {
    const a = clone(b);
    a.kpis[0]!.formula_descricao = 'linha 1\nlinha 2';
    expect(erros(a).some((e) => e.includes('uma linha'))).toBe(true);
    const c = clone(b);
    c.kpis[0]!.nome = 'x'.repeat(61);
    expect(erros(c).some((e) => e.includes('acima de 60'))).toBe(true);
    const d = clone(b);
    d.kpis[0]!.formulario = ['indicador'];
    expect(erros(d).some((e) => e.includes('formulário sem'))).toBe(true);
  });

  it('cifra em R$ ou prazo numérico em qualquer texto', () => {
    const a = clone(b);
    a.investimentos[0]!.descricao += ' Custa R$ 5.000.';
    expect(erros(a).some((e) => e.includes('cifra em R$'))).toBe(true);
    const c = clone(b);
    c.kpis[0]!.formula_descricao = 'Leads respondidos em até 24 horas';
    expect(erros(c).some((e) => e.includes('prazo numérico'))).toBe(true);
  });

  it('ids duplicados ou fora do padrão; CRM fora de situação futura; KPI de Cliente sem marca de acompanhamento', () => {
    const a = clone(b);
    a.documentos[1]!.id = a.documentos[0]!.id;
    expect(erros(a).some((e) => e.includes('duplicados'))).toBe(true);
    const c = clone(b);
    c.ferramentas.find((f) => /crm próprio/i.test(f.nome))!.situacao = 'em_uso';
    expect(erros(c).some((e) => e.includes('CRM próprio'))).toBe(true);
    const d = clone(b);
    delete d.kpis.find((k) => k.setor_id === 'setor_12')!.acompanhamento;
    expect(erros(d).some((e) => e.includes('acompanhamento'))).toBe(true);
  });
});
