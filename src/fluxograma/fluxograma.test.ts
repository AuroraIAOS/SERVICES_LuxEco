// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { XMLValidator } from 'fast-xml-parser';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Matriz } from '../dados/tipos.ts';
import { mermaidFase, mermaidSetor, rotulo } from './mermaid.ts';
import { quebrar, raiasFase, raiasSetor } from './raias.ts';

let m: Matriz;
beforeAll(() => {
  m = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../data/matriz_v07.json'), 'utf8')) as Matriz;
});

const largura = (svg: string) => Number(/<svg[^>]* width="(\d+)"/.exec(svg)?.[1]);
const escapado = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

describe('quebrar()', () => {
  it('quebra em linhas de no máximo N caracteres, sem perder palavras', () => {
    const linhas = quebrar('Comunica alterações ao Administrativo e ao cliente', 20);
    expect(linhas.every((l) => l.length <= 20)).toBe(true);
    expect(linhas.join(' ')).toBe('Comunica alterações ao Administrativo e ao cliente');
  });
  it('corta palavra maior que a linha e nunca devolve vazio', () => {
    expect(quebrar('supercalifragilistico', 10).every((l) => l.length <= 10)).toBe(true);
    expect(quebrar('', 10)).toEqual(['']);
  });
});

describe('SVG de raias — decisão do spike 01.5', () => {
  it('todo setor gera SVG válido dentro do limite de largura (≤ 2600 px)', () => {
    for (const s of m.setores) {
      const svg = raiasSetor(m, s.id);
      expect(XMLValidator.validate(svg), s.nome).toBe(true);
      expect(largura(svg), s.nome).toBeLessThanOrEqual(2600);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });
  it('toda fase gera SVG válido dentro do limite de largura (≤ 3200 px)', () => {
    for (const f of m.fases) {
      const svg = raiasFase(m, f.id);
      expect(XMLValidator.validate(svg), f.nome).toBe(true);
      expect(largura(svg), f.nome).toBeLessThanOrEqual(3200);
    }
  });
  it('mantém a largura A3 legível: fonte efetiva ≥ 8 pt nos maiores diagramas (escala ≥ 0,76)', () => {
    const maior = Math.max(...m.setores.map((s) => largura(raiasSetor(m, s.id))), ...m.fases.map((f) => largura(raiasFase(m, f.id))));
    const escala = 1512 / maior; // largura útil A3 paisagem
    expect(14 * 0.75 * Math.min(1, escala)).toBeGreaterThanOrEqual(8);
  });
  it('mostra TODAS as ações do setor e os dois ramos de cada IF/ELSE', () => {
    const setor = m.setores.find((s) => s.nome === 'Vendas');
    expect(setor).toBeDefined();
    const svg = raiasSetor(m, setor?.id ?? '');
    const marca = (t: string) => escapado(t.split(' ')[0] ?? '');
    for (const a of m.acoes.filter((x) => x.setor_id === setor?.id)) expect(svg).toContain(marca(a.texto));
    const ifelse = m.condicionais.filter((c) => c.acao_id.startsWith('acao_02_'));
    expect(ifelse.length).toBeGreaterThan(0);
    expect((svg.match(/<title>IF\/ELSE<\/title>/g) ?? []).length).toBe(ifelse.length);
    expect(svg).toContain('✓');
    expect(svg).toContain('✗');
  });
  it('não corta nome de setor no meio (ex.: "Administrativo", "Contabilidade")', () => {
    const svg = raiasFase(m, 2);
    expect(svg).toContain('>Administrativo<');
    expect(svg).toContain('>Contabilidade<');
  });
  it('escapa texto malicioso (nada vira tag)', () => {
    const suja = structuredClone(m);
    const a = suja.acoes[0];
    if (a) a.texto = '<script>alert(1)</script> & "aspas"';
    const svg = raiasSetor(suja, a?.setor_id ?? '');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(XMLValidator.validate(svg)).toBe(true);
  });
  it('é determinístico e o tema escuro difere do claro', () => {
    expect(raiasFase(m, 1)).toBe(raiasFase(m, 1));
    expect(raiasFase(m, 1, { tema: 'escuro' })).not.toBe(raiasFase(m, 1, { tema: 'claro' }));
  });
  it('setor ou fase inexistente falha com mensagem clara', () => {
    expect(() => raiasSetor(m, 'setor_99')).toThrow(/inexistente/);
    expect(() => raiasFase(m, 9)).toThrow(/inexistente/);
  });
});

describe('gerador Mermaid (usado no export .mermaid)', () => {
  it('gera flowchart LR com um nó por ação e losango nos IF/ELSE', () => {
    const setor = m.setores.find((s) => s.nome === 'Vendas');
    const codigo = mermaidSetor(m, setor?.id ?? '');
    expect(codigo.startsWith('flowchart LR')).toBe(true);
    const acoes = m.acoes.filter((a) => a.setor_id === setor?.id);
    expect(acoes.length).toBeGreaterThan(0);
    expect((codigo.match(/\{"/g) ?? []).length).toBe(acoes.filter((a) => a.e_condicional).length);
    expect(codigo).toContain('-->|"Sim:');
  });
  it('fluxo por fase encadeia os portões dos estágios', () => {
    const codigo = mermaidFase(m, 2);
    expect(codigo).toContain('G10 --> G11');
    expect(codigo).not.toContain('G14 --> G15');
  });
  it('rotulo() escapa aspas e quebras de linha', () => {
    expect(rotulo('a "b"\nc')).toBe('a #quot;b#quot; c');
  });
});
