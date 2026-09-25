// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { comparar, HTML_LEGADO, lerJson, lerLegado } from '../../scripts/comparar_mmo_legado.ts';
import type { MapaCondicionais } from '../../scripts/validar_dados.ts';
import { ESPERADO_V07, validarMapa, validarV07 } from '../../scripts/validar_dados.ts';
import { JSON_V07, lerMatriz, separarIfElse, serializar, textoOriginalIfElse } from '../../scripts/xlsx_para_json.ts';
import type { Matriz } from './tipos.ts';

const RAIZ = resolve(import.meta.dirname, '../..');
let matriz: Matriz;
let mapa: MapaCondicionais;

beforeAll(() => {
  matriz = lerMatriz();
  mapa = JSON.parse(readFileSync(resolve(RAIZ, 'data/conteudo/mapa_condicionais.json'), 'utf8')) as MapaCondicionais;
});

const clone = <T,>(x: T): T => structuredClone(x);

describe('Matriz V07 lida da planilha', () => {
  it('bate com as contagens do plano: 12 setores, 22 estágios, 212 células, 31 IF/ELSE', () => {
    expect(matriz.setores).toHaveLength(ESPERADO_V07.setores);
    expect(matriz.estagios).toHaveLength(ESPERADO_V07.estagios);
    expect(matriz.acoes).toHaveLength(ESPERADO_V07.celulas);
    expect(matriz.condicionais).toHaveLength(ESPERADO_V07.if_else);
  });

  it('PARA na linha "LEGENDA DE CORES" (sem a parada seriam 216 células e o Cliente teria célula no Est. 01)', () => {
    expect(matriz.meta.leitura_encerra_em).toContain('linha 42');
    const cliente = matriz.setores.find((s) => s.nome === 'Cliente');
    expect(cliente).toBeDefined();
    expect(matriz.acoes.some((a) => a.setor_id === cliente?.id && a.estagio_id === 1)).toBe(false);
    expect(matriz.acoes.every((a) => !a.texto.includes('LEGENDA'))).toBe(true);
  });

  it('distribui os estágios nas 4 fases do plano (1–9, 10–14, 15–19, 20–22)', () => {
    const porFase = (f: number) => matriz.estagios.filter((e) => e.fase_id === f).map((e) => e.id);
    expect(porFase(1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(porFase(2)).toEqual([10, 11, 12, 13, 14]);
    expect(porFase(3)).toEqual([15, 16, 17, 18, 19]);
    expect(porFase(4)).toEqual([20, 21, 22]);
  });

  it('marca exatamente 4 ações do Grupo de Fluxo WhatsApp (células lilás da legenda)', () => {
    expect(matriz.acoes.filter((a) => a.canal === 'whatsapp_grupo_fluxo')).toHaveLength(4);
  });

  it('a ordem das ações no par setor × estágio é 1..n, sem buracos', () => {
    expect(validarV07(matriz)).toEqual([]);
  });

  it('é determinística: duas leituras geram o mesmo JSON, e o arquivo versionado está em dia', () => {
    expect(serializar(lerMatriz())).toBe(serializar(matriz));
    expect(readFileSync(JSON_V07, 'utf8').replace(/\r\n/g, '\n')).toBe(serializar(matriz));
  });

  it('não altera o texto: cada IF/ELSE se reconstrói com "(IF/ELSE)", 2 ramos e setas', () => {
    for (const c of matriz.condicionais) {
      const a = matriz.acoes.find((x) => x.id === c.acao_id);
      expect(a).toBeDefined();
      if (!a) continue;
      const t = textoOriginalIfElse(a, c);
      expect(t).toMatch(/\n\(IF\/ELSE\) .+ → .+ \| .+ → .+$/);
      expect(separarIfElse(t, a.celula)).toEqual({ base: c.pergunta, se_sim: c.se_sim, se_nao: c.se_nao });
    }
  });
});

describe('separarIfElse — erros claros', () => {
  it('rejeita célula sem marcador, com 1 ramo ou sem seta, citando a célula', () => {
    expect(() => separarIfElse('sem marcador', 'B2')).toThrow(/B2/);
    expect(() => separarIfElse('x\n(IF/ELSE) A → a', 'C3')).toThrow(/2 ramos/);
    expect(() => separarIfElse('x\n(IF/ELSE) A → a | B sem seta', 'D4')).toThrow(/sem " → "/);
  });
});

describe('validarV07 detecta dado corrompido (mutações)', () => {
  it('ação removida → regra 2', () => {
    const m = clone(matriz);
    m.acoes.pop();
    expect(validarV07(m).some((e) => e.startsWith('Regra 2'))).toBe(true);
  });
  it('id duplicado → regra 1', () => {
    const m = clone(matriz);
    const [a, b] = m.acoes;
    if (a && b) b.id = a.id;
    expect(validarV07(m).some((e) => e.startsWith('Regra 1'))).toBe(true);
  });
  it('setor inexistente → integridade referencial', () => {
    const m = clone(matriz);
    const a = m.acoes[0];
    if (a) a.setor_id = 'setor_99';
    expect(validarV07(m).some((e) => e.includes('setor_99'))).toBe(true);
  });
  it('condicional órfã → erro', () => {
    const m = clone(matriz);
    const c = m.condicionais[0];
    if (c) c.acao_id = 'acao_inexistente';
    expect(validarV07(m).some((e) => e.includes('inexistente'))).toBe(true);
  });
});

describe('mapa das 15 situações', () => {
  it('fecha em 15 situações e coloca cada uma das 31 condicionais exatamente uma vez', () => {
    expect(validarMapa(matriz, mapa)).toEqual([]);
    expect(mapa.situacoes).toHaveLength(15);
  });
  it('declara as 4 divergências de estágio entre o Mapa e a planilha (5, 12, 13, 14)', () => {
    expect(mapa.situacoes.filter((s) => s.divergencia_estagio).map((s) => s.numero)).toEqual([5, 12, 13, 14]);
  });
  it('condicional em dois lugares → erro', () => {
    const m = clone(mapa);
    const s0 = m.situacoes[0];
    const s1 = m.situacoes[1];
    if (s0 && s1) s1.condicionais_ids.push(...s0.condicionais_ids);
    expect(validarMapa(matriz, m).some((e) => e.includes('mais de um lugar'))).toBe(true);
  });
  it('condicional sem destino → erro', () => {
    const m = clone(mapa);
    m.situacoes.forEach((s) => (s.participantes = []));
    expect(validarMapa(matriz, m).some((e) => e.includes('sem destino'))).toBe(true);
  });
});

describe('paridade com o MMO_v01 legado (regra 8)', () => {
  const html = readFileSync(HTML_LEGADO, 'utf8');
  it('mesma presença setor × estágio e mesma quantidade de ações', () => {
    const c = comparar(lerLegado(html), lerJson(matriz));
    expect(c).toEqual({ soNoLegado: [], soNoJson: [], contagemDiferente: [] });
  });
  it('lê as 22 pílulas do legado', () => {
    const estagios = new Set([...lerLegado(html).keys()].map((k) => k.split('|')[0]));
    expect(estagios.size).toBe(22);
  });
  it('a comparação é sensível: presença removida ou contagem alterada são detectadas', () => {
    const legado = lerLegado(html);
    const json = lerJson(matriz);
    const [k] = [...json.keys()];
    if (!k) throw new Error('JSON vazio');
    const semUma = new Map(json);
    semUma.delete(k);
    expect(comparar(legado, semUma).soNoLegado).toContain(k);
    const alterada = new Map(json).set(k, (json.get(k) ?? 0) + 1);
    expect(comparar(legado, alterada).contagemDiferente).toHaveLength(1);
  });
});
