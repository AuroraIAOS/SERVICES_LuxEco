// @vitest-environment node
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AnotacoesV08 } from '../../scripts/compor_v08.ts';
import { compor, comporDosArquivos, JSON_ANOTACOES, JSON_MAPA, JSON_V08 } from '../../scripts/compor_v08.ts';
import type { MapaCondicionais } from '../../scripts/validar_dados.ts';
import { validarV08 } from '../../scripts/validar_dados.ts';
import { JSON_V07, serializar } from '../../scripts/xlsx_para_json.ts';
import type { Matriz, MatrizV08 } from './tipos.ts';

const ORIGEM = 'anotacoes_ceo_2026-09-24';
const ler = <T,>(caminho: string): T => JSON.parse(readFileSync(caminho, 'utf8')) as T;
const clone = <T,>(x: T): T => structuredClone(x);

let v07: Matriz;
let overlay: AnotacoesV08;
let mapa: MapaCondicionais;
let v08: MatrizV08;

beforeAll(() => {
  v07 = ler<Matriz>(JSON_V07);
  overlay = ler<AnotacoesV08>(JSON_ANOTACOES);
  mapa = ler<MapaCondicionais>(JSON_MAPA);
  v08 = compor(v07, overlay, mapa);
});

const erros = (m: MatrizV08 = v08) => validarV08(m, v07, mapa, compor(v07, overlay, mapa));

describe('Matriz V08 = V07 + overlay das Anotações do CEO', () => {
  it('tem mais células e mais condicionais que a V07 e fecha sem nenhum erro de validação', () => {
    expect(v08.acoes.length).toBeGreaterThan(v07.acoes.length);
    expect(v08.condicionais.length).toBeGreaterThan(v07.condicionais.length);
    expect(erros()).toEqual([]);
  });

  it('acrescenta exatamente as células do overlay (V07 + celulas_novas), e as IF/ELSE novas viram condicionais', () => {
    const novas = overlay.celulas_novas;
    expect(v08.acoes).toHaveLength(v07.acoes.length + novas.length);
    expect(v08.condicionais).toHaveLength(v07.condicionais.length + novas.filter((c) => c.se_sim).length);
    expect(v08.acoes.filter((a) => a.e_condicional)).toHaveLength(v08.condicionais.length);
  });

  it('mantém os 12 setores e os 22 estágios idênticos (nada renomeado nem reordenado)', () => {
    expect(v08.setores).toEqual(v07.setores);
    expect(v08.estagios).toEqual(v07.estagios);
    expect(v08.fases).toEqual(v07.fases);
  });

  it('não altera nenhuma ação da V07: mesmas ações, na mesma posição, sem origem_doc', () => {
    v07.acoes.forEach((a, i) => expect(v08.acoes[i]).toEqual(a));
    expect(v08.acoes.slice(0, v07.acoes.length).some((a) => a.origem_doc)).toBe(false);
  });

  it('não altera nenhuma condicional da V07: só ganha situacao_id', () => {
    v07.condicionais.forEach((c, i) => {
      const { situacao_id: _, ...atual } = v08.condicionais[i]!;
      expect(atual).toEqual(c);
    });
  });

  it('todo item novo carrega origem_doc = anotacoes_ceo_2026-09-24', () => {
    const idsV07 = new Set(v07.acoes.map((a) => a.id));
    const novas = v08.acoes.filter((a) => !idsV07.has(a.id));
    expect(novas.length).toBeGreaterThanOrEqual(1);
    expect(novas.every((a) => a.origem_doc === ORIGEM)).toBe(true);
  });

  it('não cria par setor × estágio novo: as células novas entram em pares que a V07 já tinha', () => {
    const pares = (m: Matriz) => new Set(m.acoes.map((a) => `${a.setor_id}|${a.estagio_id}`));
    expect(pares(v08)).toEqual(pares(v07));
  });

  it('as novas ficam ao fim do par setor × estágio (ordem 1..n contínua, ids únicos)', () => {
    const idsV07 = new Set(v07.acoes.map((a) => a.id));
    for (const a of v08.acoes.filter((x) => !idsV07.has(x.id))) {
      const daV07 = v07.acoes.filter((x) => x.setor_id === a.setor_id && x.estagio_id === a.estagio_id).length;
      expect(a.ordem).toBeGreaterThan(daV07);
    }
    expect(new Set(v08.acoes.map((a) => a.id)).size).toBe(v08.acoes.length);
  });

  it('preenche situacao_id nas condicionais da V07 conforme o mapa: 28 vinculadas, 3 sem situação', () => {
    const semSituacao = new Set(mapa.sem_situacao.map((x) => x.condicional_id));
    const daV07 = v08.condicionais.slice(0, v07.condicionais.length);
    expect(daV07.filter((c) => c.situacao_id)).toHaveLength(v07.condicionais.length - semSituacao.size);
    expect(daV07.filter((c) => !c.situacao_id).map((c) => c.id).sort()).toEqual([...semSituacao].sort());
    const sit = (id: string) => v08.condicionais.find((c) => c.id === id)?.situacao_id;
    expect(sit('cond_02_02_5')).toBe('sit_01');
    expect(sit('cond_06_17_3')).toBe('sit_09'); // vínculo direto de 2 células na mesma situação
  });

  it('as condicionais novas ainda não têm situação (as 15 do Mapa seguem sendo do Mapa)', () => {
    const ids = new Set(v07.condicionais.map((c) => c.id));
    expect(v08.condicionais.filter((c) => !ids.has(c.id)).every((c) => c.situacao_id === undefined)).toBe(true);
  });

  it('o Est. 02 e o Est. 22 ganham as ramificações das Anotações (perfis, Energia por Assinatura, pós-venda)', () => {
    const textos = (est: number) => {
      const novas = v08.acoes.filter((a) => a.origem_doc && a.estagio_id === est);
      const ramos = v08.condicionais.filter((c) => novas.some((a) => a.id === c.acao_id)).flatMap((c) => [c.se_sim.texto, c.se_nao.texto]);
      return [...novas.map((a) => a.texto), ...ramos].join(' | ');
    };
    expect(textos(2)).toContain('Energia por Assinatura da Lux');
    expect(textos(2)).toContain('perfil do cliente');
    expect(textos(2)).toContain('lead como quente, morno ou frio');
    expect(textos(22)).toContain('retrofit');
    expect(textos(22)).toContain('indicações');
    expect(textos(22)).toContain('oportunidades');
  });

  it('inclui perfis, leads, oportunidades e respostas-padrão vindos das Anotações', () => {
    expect(v08.perfis_cliente.length).toBeGreaterThanOrEqual(4);
    expect(v08.classificacao_lead.map((l) => l.id)).toEqual(['lead_quente', 'lead_morno', 'lead_frio']);
    expect(v08.oportunidades.length).toBeGreaterThanOrEqual(10);
    expect(v08.oportunidades.every((o) => o.origem === 'sugerido')).toBe(true); // prioridade padrão = inferência do consultor
    expect(v08.respostas_padrao).toHaveLength(4);
  });

  it('reproduz as diretrizes do CEO sem editar o sentido: “boleto” nas células e IBS nas respostas com revisão jurídica', () => {
    expect(v08.acoes.some((a) => a.origem_doc && a.texto.includes('“boleto”'))).toBe(true);
    const garantia = v08.respostas_padrao.find((r) => r.id === 'resp_01');
    expect(garantia?.texto).toContain('IBS (Instituto Brasileiro de Energia Solar)');
    expect(garantia?.revisao_juridica).toBe(true);
    expect(v08.respostas_padrao.find((r) => r.id === 'resp_02')?.revisao_juridica).toBe(true);
  });

  it('nenhum conteúdo novo traz cifra em R$ nem prazo numérico (SLA) que os documentos não tragam', () => {
    const json = JSON.stringify([overlay.celulas_novas, overlay.perfis_cliente, overlay.oportunidades, overlay.respostas_padrao]);
    expect(json).not.toMatch(/R\$/);
    expect(json).not.toMatch(/\b\d+\s*(?:dias?|horas?|minutos?|semanas?|meses)\b/i);
  });

  it('é determinística e o data/matriz_v08.json versionado está em dia com V07 + overlay', () => {
    expect(serializar(comporDosArquivos())).toBe(serializar(v08));
    expect(readFileSync(JSON_V08, 'utf8').replace(/\r\n/g, '\n')).toBe(serializar(v08));
  });

  it('compor não muta a V07 (overlay puro)', () => {
    const antes = JSON.stringify(v07);
    compor(v07, overlay, mapa);
    expect(JSON.stringify(v07)).toBe(antes);
  });
});

describe('validarV08 detecta erro (sensibilidade)', () => {
  it('ação da V07 alterada', () => {
    const m = clone(v08);
    m.acoes[0]!.texto += ' (editado)';
    expect(erros(m).some((e) => e.includes(v07.acoes[0]!.id) && e.includes('alterada'))).toBe(true);
  });

  it('condicional da V07 alterada', () => {
    const m = clone(v08);
    m.condicionais[0]!.se_sim.texto = 'outra coisa';
    expect(erros(m).some((e) => e.includes(v07.condicionais[0]!.id))).toBe(true);
  });

  it('setor ou estágio renomeado', () => {
    const a = clone(v08);
    a.setores[0]!.nome = 'Outro';
    expect(erros(a).some((e) => e.includes('setores da V08 diferem'))).toBe(true);
    const b = clone(v08);
    b.estagios[1]!.nome = 'Outro';
    expect(erros(b).some((e) => e.includes('estágios da V08 diferem'))).toBe(true);
  });

  it('ação nova sem origem_doc', () => {
    const m = clone(v08);
    delete m.acoes[m.acoes.length - 1]!.origem_doc;
    expect(erros(m).some((e) => e.includes('não tem origem_doc'))).toBe(true);
  });

  it('ação da V07 marcada como nova (origem_doc indevido)', () => {
    const m = clone(v08);
    m.acoes[3]!.origem_doc = ORIGEM;
    expect(erros(m).some((e) => e.includes('não pode ter origem_doc'))).toBe(true);
  });

  it('V08 sem nada novo (não supera a V07)', () => {
    const m = clone(v08);
    m.acoes = m.acoes.slice(0, v07.acoes.length);
    m.condicionais = m.condicionais.slice(0, v07.condicionais.length);
    expect(erros(m).some((e) => e.includes('deve superar'))).toBe(true);
  });

  it('cifra em R$ e prazo numérico no conteúdo novo', () => {
    const a = clone(v08);
    a.acoes[a.acoes.length - 1]!.texto = 'Cobra R$ 500 do cliente';
    expect(erros(a).some((e) => e.includes('cifra em R$'))).toBe(true);
    const b = clone(v08);
    b.acoes[b.acoes.length - 1]!.texto = 'Responde em 24 horas';
    expect(erros(b).some((e) => e.includes('prazo numérico'))).toBe(true);
  });

  it('situacao_id que o mapa não manda', () => {
    const m = clone(v08);
    m.condicionais[0]!.situacao_id = 'sit_15';
    expect(erros(m).some((e) => e.includes('situacao_id'))).toBe(true);
  });

  it('arquivo desatualizado em relação ao overlay', () => {
    const m = clone(v08);
    m.perfis_cliente[0]!.nome += ' (editado à mão)';
    expect(erros(m).some((e) => e.includes('desatualizada'))).toBe(true);
  });

  it('ids duplicados e ordem quebrada', () => {
    const a = clone(v08);
    a.acoes[a.acoes.length - 1]!.id = a.acoes[0]!.id;
    expect(erros(a).some((e) => e.includes('duplicados'))).toBe(true);
    const b = clone(v08);
    b.acoes[b.acoes.length - 1]!.ordem += 5;
    expect(erros(b).some((e) => e.includes('Ordem não contígua'))).toBe(true);
  });
});

describe('compor falha com mensagem clara em overlay inválido', () => {
  const base = (): AnotacoesV08 => clone(overlay);

  it('setor inexistente', () => {
    const o = base();
    o.celulas_novas[0]!.setor_id = 'setor_99';
    expect(() => compor(v07, o, mapa)).toThrow(/setor_id inexistente/);
  });

  it('estágio inexistente', () => {
    const o = base();
    o.celulas_novas[0]!.estagio_id = 99;
    expect(() => compor(v07, o, mapa)).toThrow(/estagio_id inexistente/);
  });

  it('IF/ELSE com um ramo só', () => {
    const o = base();
    const i = o.celulas_novas.findIndex((c) => c.se_sim);
    delete o.celulas_novas[i]!.se_nao;
    expect(() => compor(v07, o, mapa)).toThrow(/dois ramos/);
  });

  it('sem fonte_secao (rastreabilidade)', () => {
    const o = base();
    o.celulas_novas[0]!.fonte_secao = ' ';
    expect(() => compor(v07, o, mapa)).toThrow(/fonte_secao/);
  });
});
