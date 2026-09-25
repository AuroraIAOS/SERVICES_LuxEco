// @vitest-environment node
// Exportações do POP (03.2): .docx (aberto de volta e conferido por scripts/verificar_docx.mjs), HTML do PDF e nome do arquivo.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { BIBLIOTECAS } from '../dados/bibliotecas';
import { DOCUMENTO_FICHAS } from '../dados/fichas';
import { MATRIZ_V08 } from '../dados/matriz';
import { PERGUNTAS_POP, POP_OBSERVACOES, POP_TEMPLATES } from '../dados/pop';
import { estadoFpeVazio } from '../estado/armazenamento';
import { gerarPop, textoDoPop } from '../pop/gerar';
import type { Pop } from '../pop/gerar';
import { montarFpe } from '../telas/fpe/modelo';
import { NOTA_PROPRIEDADE } from '../ui/identidade';
import { nomeArquivoPop } from './baixar';
import { gerarDocx } from './pop_docx';
import { htmlPop } from './pop_pdf';

const entrada = { v08: MATRIZ_V08, fpe: montarFpe(MATRIZ_V08, DOCUMENTO_FICHAS, estadoFpeVazio()), bibliotecas: BIBLIOTECAS, perguntas: PERGUNTAS_POP.perguntas, templates: POP_TEMPLATES, observacoes: POP_OBSERVACOES };
const geral: Pop = gerarPop({ tipo: 'geral' }, entrada);
const vendas: Pop = gerarPop({ tipo: 'setor', setorId: 'setor_02' }, entrada);
const DATA = '25/09/2026';
const RAIZ = resolve(import.meta.dirname, '../..');
const verificar = (arquivo: string) => spawnSync('node', ['scripts/verificar_docx.mjs', arquivo], { cwd: RAIZ, encoding: 'utf8' });

async function salvar(pop: Pop, nome: string): Promise<string> {
  mkdirSync(resolve(RAIZ, 'saidas_teste'), { recursive: true });
  const caminho = resolve('saidas_teste', nome);
  writeFileSync(resolve(RAIZ, caminho), await gerarDocx(pop, DATA));
  return caminho;
}
const xmlDe = (bytes: Uint8Array, parte: string) => strFromU8(unzipSync(bytes)[parte]!);

describe('nome do arquivo do POP', () => {
  it('pop_<setor|geral>_<AAAA-MM-DD>.<ext>', () => {
    const d = new Date(2026, 8, 25, 14, 30);
    expect(nomeArquivoPop('Equipe Técnica', 'docx', d)).toBe('pop_equipe-tecnica_2026-09-25.docx');
    expect(nomeArquivoPop('geral', 'pdf', d)).toBe('pop_geral_2026-09-25.pdf');
  });
});

describe('.docx do POP', () => {
  it('é um zip de Word válido e o verificador conta as 11 seções (geral e setorial)', async () => {
    for (const [pop, nome] of [[geral, 'pop_geral.docx'], [vendas, 'pop_vendas.docx']] as const) {
      const caminho = await salvar(pop, nome);
      const saida = execFileSync('node', ['scripts/verificar_docx.mjs', caminho], { cwd: RAIZ, encoding: 'utf8' });
      expect(saida.trim(), nome).toBe('OK: secoes=11');
    }
  });

  it('todo o texto do POP está no documento, inclusive as 236 fichas no geral', async () => {
    const bytes = await gerarDocx(geral, DATA);
    const xml = xmlDe(bytes, 'word/document.xml');
    expect(xml).toContain('POP geral');
    expect(xml).toContain('Observações para revisão jurídica');
    for (const o of POP_OBSERVACOES.itens) expect(xml).toContain(o.palavra_chave);
    // um passo por ficha: “N. texto” em negrito; conta os passos pelos rótulos “Como: ”
    expect((xml.match(/Como: /g) ?? []).length).toBeGreaterThanOrEqual(236);
  });

  it('capa, sumário com as 11 seções e rodapé com a nota de propriedade intelectual e a numeração de páginas', async () => {
    const bytes = await gerarDocx(vendas, DATA);
    const doc = xmlDe(bytes, 'word/document.xml');
    expect(doc).toContain('POP — Vendas');
    expect(doc).toContain('gerado em 25/09/2026');
    expect(doc).toContain('Sumário');
    const rodape = xmlDe(bytes, 'word/footer1.xml');
    expect(rodape).toContain(NOTA_PROPRIEDADE.replace(/&/g, '&amp;'));
    expect(rodape).toMatch(/PAGE/);
    expect(rodape).toMatch(/NUMPAGES/);
  });

  it('usa a fonte e as cores dos tokens da marca (nenhuma cor fora dos tokens)', async () => {
    const xml = xmlDe(await gerarDocx(vendas, DATA), 'word/document.xml');
    expect(xml).toContain('w:ascii="Cyntho Next"');
    const cores = new Set([...xml.matchAll(/w:(?:color|fill)(?: w:val)?="([0-9A-Fa-f]{6})"/g)].map((m) => m[1]!.toUpperCase()));
    expect([...cores].sort()).toEqual(['181F28', '374A5E', 'F3C51E'].sort());
  });

  it('as tabelas de condicionais e de indicadores viram tabelas do Word com linha de cabeçalho', async () => {
    const xml = xmlDe(await gerarDocx(vendas, DATA), 'word/document.xml');
    expect((xml.match(/<w:tbl>/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(xml).toContain('<w:tblHeader');
  });

  it('texto com quebra de linha não some e caracteres especiais são escapados', async () => {
    const pop: Pop = { ...vendas, secoes: vendas.secoes.map((s, i) => (i === 0 ? { ...s, blocos: [{ tipo: 'paragrafo', texto: 'Linha 1\nLinha 2 <b>& “aspas”' }] } : s)) };
    const xml = xmlDe(await gerarDocx(pop, DATA), 'word/document.xml');
    expect(xml).toContain('Linha 1');
    expect(xml).toContain('<w:br/>');
    expect(xml).toContain('&lt;b&gt;&amp; “aspas”');
  });
});

describe('verificar_docx.mjs (sensibilidade)', () => {
  it('recusa arquivo inexistente, arquivo que não é docx e POP com seção faltando', async () => {
    expect(verificar('saidas_teste/nao_existe.docx').status).toBe(1);
    writeFileSync(resolve(RAIZ, 'saidas_teste/lixo.docx'), 'não sou um zip');
    expect(verificar('saidas_teste/lixo.docx').status).toBe(1);
    const curto: Pop = { ...vendas, secoes: vendas.secoes.slice(0, 10) };
    const r = verificar(await salvar(curto, 'pop_10_secoes.docx'));
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/10 seções/);
  });

  it('recusa seção 11 fora do lugar', async () => {
    const trocado: Pop = { ...vendas, secoes: [...vendas.secoes.slice(0, 9), vendas.secoes[10]!, vendas.secoes[9]!] };
    expect(verificar(await salvar(trocado, 'pop_trocado.docx')).status).toBe(1);
  });
});

describe('HTML do PDF do POP', () => {
  it('traz título, sumário e as 11 seções em ordem, com a nota de propriedade intelectual', () => {
    const html = htmlPop(vendas, DATA);
    expect(html).toContain('<h1>POP — Vendas</h1>');
    expect(html).toContain('exportado em 25/09/2026');
    expect(html).toContain(NOTA_PROPRIEDADE.replace(/&/g, '&amp;'));
    const titulos = [...html.matchAll(/<section class="impressao__secao-pop"><h2>(\d+)\. ([^<]+)<\/h2>/g)];
    expect(titulos.map((m) => Number(m[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(titulos.at(-1)![2]).toBe('Observações para revisão jurídica');
    expect((html.match(/<li>\d+\. /g) ?? []).length).toBe(11);
  });

  it('escapa HTML vindo dos dados (nada é interpretado)', () => {
    const pop: Pop = { ...vendas, secoes: vendas.secoes.map((s, i) => (i === 0 ? { ...s, blocos: [{ tipo: 'paragrafo', texto: '<script>alert(1)</script>' }] } : s)) };
    const html = htmlPop(pop, DATA);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('o geral tem um artigo por ficha e o mesmo texto que a estrutura', () => {
    const html = htmlPop(geral, DATA);
    expect((html.match(/<article class="impressao__passo">/g) ?? []).length).toBe(236);
    expect(textoDoPop(geral)).toContain('Observações para revisão jurídica');
  });
});
