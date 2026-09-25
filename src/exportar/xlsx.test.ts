// @vitest-environment node
// Exportação .xlsx (03.4): 12 setores + 4 bibliotecas + 1 POP geral; o arquivo é lido de volta e conferido com os dados.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { BIBLIOTECAS } from '../dados/bibliotecas';
import { DOCUMENTO_FICHAS } from '../dados/fichas';
import { MATRIZ_V08 } from '../dados/matriz';
import { PERGUNTAS_POP, POP_OBSERVACOES, POP_TEMPLATES } from '../dados/pop';
import { editarCampo, estadoFpeVazio } from '../estado/armazenamento';
import { editarResposta, estadoPopVazio, respostasDoEstado } from '../estado/pop';
import { gerarPop } from '../pop/gerar';
import { montarFpe, valoresPadrao } from '../telas/fpe/modelo';
import { NOME_MARCA, NOTA_PROPRIEDADE } from '../ui/identidade';
import { nomeArquivoXlsx } from './baixar';
import { gerarXlsx } from './xlsx';
import type { PastaXlsx } from './xlsx_dados';
import { LIMITE_CELULA, montarPastaXlsx, nomeDeAbaValido } from './xlsx_dados';
import { exportarXlsx } from './xlsx_exportar';

const AGORA = new Date(2026, 8, 25, 14, 30);
const RAIZ = resolve(import.meta.dirname, '../..');

function pasta(estadoFpe = estadoFpeVazio(), respostas: Record<string, string> = {}): PastaXlsx {
  const fpe = montarFpe(MATRIZ_V08, DOCUMENTO_FICHAS, estadoFpe);
  const popGeral = gerarPop({ tipo: 'geral' }, { v08: MATRIZ_V08, fpe, bibliotecas: BIBLIOTECAS, perguntas: PERGUNTAS_POP.perguntas, templates: POP_TEMPLATES, observacoes: POP_OBSERVACOES, respostas });
  return montarPastaXlsx({ v08: MATRIZ_V08, fpe, bibliotecas: BIBLIOTECAS, templates: POP_TEMPLATES, popGeral });
}
const ler = async (p: PastaXlsx) => XLSX.read(await gerarXlsx(p, AGORA), { type: 'array' });
const linhasDe = (wb: XLSX.WorkBook, nome: string) => XLSX.utils.sheet_to_json<string[]>(wb.Sheets[nome]!, { header: 1, blankrows: true, defval: '' });

describe('a versão vendorizada do SheetJS', () => {
  it('é a 0.20.3 (não a 0.18.5 do npm) e o package.json aponta para o .tgz do repositório', () => {
    expect(XLSX.version).toBe('0.20.3');
    const pkg = JSON.parse(readFileSync(resolve(RAIZ, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies.xlsx).toBe('file:vendor/xlsx-0.20.3.tgz');
  });
});

describe('estrutura das abas', () => {
  const p = pasta();

  it('17 abas: 12 setores (ordem da Matriz) + 4 bibliotecas + 1 POP geral', () => {
    expect(p.abas).toHaveLength(17);
    expect(p.abas.slice(0, 12).map((a) => a.nome)).toEqual(MATRIZ_V08.setores.map((s) => s.nome));
    expect(p.abas.slice(12).map((a) => a.nome)).toEqual(['Documentos', 'Ferramentas', 'Investimentos', 'KPIs', 'POP geral']);
  });

  it('todos os nomes de aba são válidos para o Excel e únicos', () => {
    for (const a of p.abas) expect(nomeDeAbaValido(a.nome), a.nome).toBe(true);
    expect(new Set(p.abas.map((a) => a.nome.toLowerCase())).size).toBe(17);
  });

  it('cada aba de setor tem uma linha por ficha (236 no total) com os 9 campos', () => {
    let total = 0;
    for (const s of MATRIZ_V08.setores) {
      const a = p.abas.find((x) => x.nome === s.nome)!;
      const esperado = DOCUMENTO_FICHAS.fichas.filter((f) => f.setor_id === s.id).length;
      expect(a.linhas, s.nome).toHaveLength(esperado);
      expect(a.colunas).toEqual(['Estágio', 'Nome do estágio', 'Decisão IF/ELSE', 'O quê', 'Por quê', 'Onde', 'Quando', 'Quem', 'Como']);
      for (const l of a.linhas) expect(l).toHaveLength(9);
      total += a.linhas.length;
    }
    expect(total).toBe(236);
  });

  it('as bibliotecas trazem todos os itens; investimentos e metas sem valor inventado', () => {
    const aba = (n: string) => p.abas.find((a) => a.nome === n)!;
    expect(aba('Documentos').linhas).toHaveLength(BIBLIOTECAS.documentos.length);
    expect(aba('Ferramentas').linhas).toHaveLength(BIBLIOTECAS.ferramentas.length);
    expect(aba('Investimentos').linhas).toHaveLength(BIBLIOTECAS.investimentos.length);
    expect(aba('KPIs').linhas).toHaveLength(BIBLIOTECAS.kpis.length);
    expect(aba('Investimentos').linhas.every((l) => l[3] === 'A definir pela Lux')).toBe(true);
    expect(aba('KPIs').linhas.every((l) => l[4] === 'A definir pela Lux')).toBe(true);
    expect(aba('Ferramentas').linhas.find((l) => l[0]!.startsWith('CRM próprio'))![1]).toBe('futura, fora do escopo deste projeto');
    expect(JSON.stringify(p.abas)).not.toMatch(/R\$\s*\d/);
  });

  it('o POP geral traz as 11 seções, os 4 itens jurídicos e um passo por ficha', () => {
    const l = p.abas.find((a) => a.nome === 'POP geral')!.linhas;
    expect(new Set(l.map((x) => x[0])).size).toBe(11);
    expect(l.filter((x) => x[2] === 'Passo')).toHaveLength(236);
    const juridicas = l.filter((x) => x[0]!.startsWith('11.') && x[2] === 'Item');
    expect(juridicas).toHaveLength(4);
    expect(juridicas.map((x) => x[3]).join(' ')).toContain('“boleto”');
    expect(l.filter((x) => x[1] === 'Cemig').length).toBeGreaterThan(0);
  });

  it('as larguras cabem no título e nunca passam de 60', () => {
    for (const a of p.abas) {
      expect(a.larguras).toHaveLength(a.colunas.length);
      a.larguras.forEach((w, i) => {
        expect(w).toBeGreaterThanOrEqual(Math.min(60, a.colunas[i]!.length));
        expect(w).toBeLessThanOrEqual(60);
      });
    }
  });
});

describe('o arquivo gravado, lido de volta', () => {
  it('tem as 17 abas, com cabeçalho, dados, linha em branco e a nota de propriedade intelectual', async () => {
    const p = pasta();
    const wb = await ler(p);
    expect(wb.SheetNames).toEqual(p.abas.map((a) => a.nome));
    for (const a of p.abas) {
      const l = linhasDe(wb, a.nome);
      expect(l[0], a.nome).toEqual(a.colunas);
      expect(l).toHaveLength(a.linhas.length + 3); // cabeçalho + dados + linha em branco + nota
      expect(l.at(-1)).toEqual([NOTA_PROPRIEDADE, ...Array(a.colunas.length - 1).fill('')].slice(0, l.at(-1)!.length));
      expect(l.slice(1, -2)).toEqual(a.linhas.map((x) => x));
    }
  });

  it('texto nenhum é truncado (a maior célula fica bem abaixo do limite do Excel e volta idêntica)', async () => {
    const p = pasta();
    const maior = Math.max(...p.abas.flatMap((a) => a.linhas.flat().map((c) => c.length)));
    expect(maior).toBeLessThan(LIMITE_CELULA / 4);
    const longo = 'x'.repeat(20_000);
    const grande: PastaXlsx = { ...p, abas: [{ nome: 'Longo', colunas: ['Texto'], linhas: [[longo]], larguras: [60] }] };
    expect(linhasDe(await ler(grande), 'Longo')[1]![0]).toBe(longo);
  });

  it('sem fórmula: toda célula é texto, e “=1+1” continua sendo texto', async () => {
    const p = pasta();
    p.abas[0]!.linhas[0]![3] = '=1+1';
    p.abas[0]!.linhas[0]![4] = '+SOMA(A1:A2)';
    p.abas[0]!.linhas[0]![5] = '@cmd|x';
    const wb = await ler(p);
    for (const ws of Object.values(wb.Sheets)) {
      for (const [ref, celula] of Object.entries(ws)) {
        if (ref.startsWith('!')) continue;
        const c = celula as XLSX.CellObject;
        expect(c.f, ref).toBeUndefined();
        expect(c.t, ref).toBe('s');
      }
    }
    expect(linhasDe(wb, p.abas[0]!.nome)[1]!.slice(3, 6)).toEqual(['=1+1', '+SOMA(A1:A2)', '@cmd|x']);
  });

  it('larguras e propriedades do arquivo (título, autor, data) vêm da marca', async () => {
    const p = pasta();
    const wb = XLSX.read(await gerarXlsx(p, AGORA), { type: 'array', cellStyles: true }); // sem cellStyles o leitor ignora as larguras
    const cols = wb.Sheets[p.abas[0]!.nome]!['!cols']!;
    expect(cols.map((c) => Math.round(c.wch ?? 0))).toEqual(p.abas[0]!.larguras);
    expect(wb.Props?.Title).toBe(p.titulo);
    expect(wb.Props?.Author).toBe(NOME_MARCA);
  });

  it('é um zip .xlsx de verdade (assinatura PK e partes do Office)', async () => {
    const bytes = await gerarXlsx(pasta(), AGORA);
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
    expect(Buffer.from(bytes).toString('latin1')).toContain('xl/workbook.xml');
  });
});

describe('valores em vigor', () => {
  it('a edição da ficha no FPE vai para a aba do setor', async () => {
    const ficha = DOCUMENTO_FICHAS.fichas.find((f) => f.setor_id === 'setor_02')!;
    const estado = editarCampo(estadoFpeVazio(), ficha.id, valoresPadrao(ficha), 'what', 'Aborda o lead pelo WhatsApp em minutos', '2026-09-25T10:00:00.000Z');
    const wb = await ler(pasta(estado));
    const vendas = linhasDe(wb, 'Vendas');
    expect(vendas.some((l) => l[3] === 'Aborda o lead pelo WhatsApp em minutos')).toBe(true);
    expect(linhasDe(await ler(pasta()), 'Vendas').some((l) => l[3] === 'Aborda o lead pelo WhatsApp em minutos')).toBe(false);
  });

  it('a resposta editada do POP vai para a aba “POP geral”', async () => {
    const perg = PERGUNTAS_POP.perguntas.find((p) => p.id === 'perg_02_4')!;
    const estadoPop = editarResposta(estadoPopVazio(), perg.id, perg.resposta_padrao, 'Confirma nome e telefone antes de simular.', '2026-09-25T10:00:00.000Z');
    const wb = await ler(pasta(estadoFpeVazio(), respostasDoEstado(estadoPop)));
    expect(linhasDe(wb, 'POP geral').some((l) => l[2] === 'Resposta' && l[3] === 'Confirma nome e telefone antes de simular.')).toBe(true);
  });

  it('exportarXlsx (o que o botão chama) devolve nome padrão e um arquivo com as 17 abas', async () => {
    const { nome, bytes } = await exportarXlsx(estadoFpeVazio(), estadoPopVazio(), AGORA);
    expect(nome).toBe('lux_fpe-pop_2026-09-25.xlsx');
    expect(nomeArquivoXlsx(AGORA)).toBe(nome);
    expect(XLSX.read(bytes, { type: 'array' }).SheetNames).toHaveLength(17);
  });
});

describe('o gravador recusa o que o Excel recusaria (sensibilidade)', () => {
  const base = pasta();
  const com = (nome: string, outro = 'Outra'): PastaXlsx => ({ ...base, abas: [{ nome, colunas: ['A'], linhas: [], larguras: [10] }, { nome: outro, colunas: ['A'], linhas: [], larguras: [10] }] });

  it.each([['Nome com : dois pontos'], ['Barra/invertida'], ['Interroga?'], ['[colchete]'], ['a'.repeat(32)], ['']])('nome de aba %j', async (nome) => {
    await expect(gerarXlsx(com(nome), AGORA)).rejects.toThrow(/inválido/);
  });

  it('duas abas com o mesmo nome, mesmo em caixa diferente', async () => {
    await expect(gerarXlsx(com('Vendas', 'VENDAS'), AGORA)).rejects.toThrow(/mesmo nome/);
  });

  it('nome de 31 caracteres é aceito', async () => {
    const wb = await ler(com('a'.repeat(31)));
    expect(wb.SheetNames[0]).toHaveLength(31);
  });
});
