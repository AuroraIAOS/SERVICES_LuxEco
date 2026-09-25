// xlsx → data/matriz_v07.json — espelho fiel da Matriz Operacional V07.
// Leitura sem SheetJS: um .xlsx é um zip de XML (fflate + fast-xml-parser). Ver handoffs/instrucoes.md §6.
// Regra do projeto: parar na linha "LEGENDA DE CORES" (as linhas seguintes são texto, não ações).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import { unzipSync, strFromU8 } from 'fflate';
import { FASES, faseDoEstagio } from '../src/dados/tipos.ts';
import type { Acao, Condicional, Estagio, Matriz, Setor } from '../src/dados/tipos.ts';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
export const XLSX_PADRAO = resolve(RAIZ, 'data/fontes/Matriz_Operacional.xlsx');
export const JSON_V07 = resolve(RAIZ, 'data/matriz_v07.json');

// Cores da legenda (styles.xml): verde = IF/ELSE, lilás = canal temporário (Grupo de Fluxo WhatsApp).
const COR_IFELSE = 'FFC8F7C5';
const COR_WHATSAPP = 'FFE8DAEF';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: false,
  isArray: (nome) => ['si', 'r', 'row', 'c', 'xf', 'fill'].includes(nome),
});

type No = Record<string, unknown>;
const obj = (x: unknown): No => (x && typeof x === 'object' ? (x as No) : {});
const lista = (x: unknown): unknown[] => (Array.isArray(x) ? x : x === undefined ? [] : [x]);
const texto = (x: unknown): string => {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object') return texto((x as No)['#text'] ?? '');
  return '';
};

/** Coluna "B" → 1, "W" → 22 (A = 0). */
function indiceColuna(letras: string): number {
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function lerZip(caminho: string): Record<string, string> {
  const arquivos = unzipSync(new Uint8Array(readFileSync(caminho)));
  const saida: Record<string, string> = {};
  for (const [nome, dados] of Object.entries(arquivos)) if (nome.endsWith('.xml')) saida[nome] = strFromU8(dados);
  return saida;
}

function stringsCompartilhadas(xml: string): string[] {
  const raiz = obj(obj(parser.parse(xml))['sst']);
  return lista(raiz['si']).map((si) => {
    const s = obj(si);
    if ('t' in s) return texto(s['t']);
    return lista(s['r']).map((r) => texto(obj(r)['t'])).join(''); // texto formatado (várias "runs")
  });
}

/** índice de estilo (`s`) → cor de preenchimento (ARGB) */
function coresPorEstilo(xml: string): string[] {
  const raiz = obj(obj(parser.parse(xml))['styleSheet']);
  const preenchimentos = lista(obj(raiz['fills'])['fill']).map((f) => {
    const fg = obj(obj(obj(f)['patternFill'])['fgColor']);
    return typeof fg['@_rgb'] === 'string' ? fg['@_rgb'] : '';
  });
  return lista(obj(raiz['cellXfs'])['xf']).map((xf) => preenchimentos[Number(obj(xf)['@_fillId'] ?? 0)] ?? '');
}

interface Celula {
  ref: string;
  linha: number;
  coluna: number;
  valor: string;
  cor: string;
}

function lerCelulas(zip: Record<string, string>): Celula[] {
  const strs = stringsCompartilhadas(zip['xl/sharedStrings.xml'] ?? '');
  const cores = coresPorEstilo(zip['xl/styles.xml'] ?? '');
  const planilha = obj(obj(parser.parse(zip['xl/worksheets/sheet1.xml'] ?? ''))['worksheet']);
  const saida: Celula[] = [];
  for (const linha of lista(obj(planilha['sheetData'])['row'])) {
    for (const c of lista(obj(linha)['c'])) {
      const cel = obj(c);
      const ref = String(cel['@_r'] ?? '');
      const m = /^([A-Z]+)(\d+)$/.exec(ref);
      if (!m || cel['v'] === undefined) continue;
      const bruto = texto(cel['v']);
      const valor = (cel['@_t'] === 's' ? (strs[Number(bruto)] ?? '') : bruto).replace(/\r\n/g, '\n');
      saida.push({
        ref,
        linha: Number(m[2]),
        coluna: indiceColuna(m[1] ?? ''),
        valor,
        cor: cores[Number(cel['@_s'] ?? 0)] ?? '',
      });
    }
  }
  return saida.sort((a, b) => a.linha - b.linha || a.coluna - b.coluna);
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const slug = (nome: string) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "Texto\n(IF/ELSE) Cond A → ação A | Cond B → ação B" → base + 2 ramos. Erro claro se fugir do padrão. */
export function separarIfElse(valor: string, ref: string) {
  const marca = '\n(IF/ELSE) ';
  const i = valor.indexOf(marca);
  if (i < 0) throw new Error(`Célula ${ref}: marcador "(IF/ELSE)" fora do padrão "texto\\n(IF/ELSE) ..."`);
  const base = valor.slice(0, i);
  const ramos = valor.slice(i + marca.length).split(' | ');
  if (ramos.length !== 2) throw new Error(`Célula ${ref}: IF/ELSE deve ter 2 ramos separados por " | " (achou ${ramos.length})`);
  const [a, b] = ramos.map((r) => {
    const j = r.indexOf(' → ');
    if (j < 0) throw new Error(`Célula ${ref}: ramo sem " → ": "${r}"`);
    return { rotulo: r.slice(0, j), texto: r.slice(j + 3) };
  });
  if (!a || !b) throw new Error(`Célula ${ref}: ramos incompletos`);
  return { base, se_sim: a, se_nao: b };
}

/** Reconstrói o texto original da célula — usado nos testes para provar o espelho fiel. */
export function textoOriginalIfElse(a: Acao, c: Condicional): string {
  return `${a.texto}\n(IF/ELSE) ${c.se_sim.rotulo} → ${c.se_sim.texto} | ${c.se_nao.rotulo} → ${c.se_nao.texto}`;
}

export function lerMatriz(caminho: string = XLSX_PADRAO): Matriz {
  const celulas = lerCelulas(lerZip(caminho));
  const marcaFim = celulas.find((c) => c.coluna === 0 && c.valor.includes('LEGENDA DE CORES'));
  if (!marcaFim) throw new Error('Linha "LEGENDA DE CORES" não encontrada — a leitura precisa de um ponto de parada.');
  const dados = celulas.filter((c) => c.linha < marcaFim.linha); // PARA na legenda

  const estagios: Estagio[] = [];
  const setores: Setor[] = [];
  const acoes: Acao[] = [];
  const condicionais: Condicional[] = [];

  for (const c of dados.filter((x) => x.linha === 1 && x.coluna > 0)) {
    const m = /^#\s*EST[ÁA]GIO\s+(\d+):\s*(.+)$/.exec(c.valor);
    if (!m) throw new Error(`Cabeçalho de estágio fora do padrão em ${c.ref}: "${c.valor}"`);
    const numero = Number(m[1]);
    if (numero !== c.coluna) throw new Error(`Estágio ${numero} está na coluna ${c.coluna} (${c.ref}); esperado alinhado.`);
    estagios.push({ id: numero, numero, nome: (m[2] ?? '').trim(), fase_id: faseDoEstagio(numero) });
  }

  let setorAtual: Setor | undefined;
  const contador = new Map<string, number>(); // "setor|estagio" → ordem
  for (const c of dados.filter((x) => x.linha > 1)) {
    if (c.coluna === 0) {
      const m = /^#\s*SETOR\s+(\d+):\s*(.+)$/.exec(c.valor);
      if (!m) throw new Error(`Cabeçalho de setor fora do padrão em ${c.ref}: "${c.valor}"`);
      const numero = Number(m[1]);
      const nome = (m[2] ?? '').trim();
      setorAtual = { id: `setor_${pad2(numero)}`, numero, nome, cor_token: `setor-${slug(nome)}` };
      setores.push(setorAtual);
      continue;
    }
    if (!setorAtual) throw new Error(`Célula ${c.ref} antes de qualquer setor.`);
    if (c.valor.trim() === '') continue;
    const chave = `${setorAtual.id}|${c.coluna}`;
    const ordem = (contador.get(chave) ?? 0) + 1;
    contador.set(chave, ordem);

    const id = `acao_${setorAtual.numero.toString().padStart(2, '0')}_${pad2(c.coluna)}_${ordem}`;
    const e_condicional = c.valor.includes('(IF/ELSE)');
    const ehIfElseVerde = c.cor === COR_IFELSE;
    if (e_condicional !== ehIfElseVerde) throw new Error(`Célula ${c.ref}: texto IF/ELSE e cor da legenda divergem.`);
    const acao: Acao = {
      id,
      setor_id: setorAtual.id,
      estagio_id: c.coluna,
      ordem,
      texto: c.valor,
      e_condicional,
      celula: c.ref,
    };
    if (c.cor === COR_WHATSAPP) acao.canal = 'whatsapp_grupo_fluxo';
    if (e_condicional) {
      const p = separarIfElse(c.valor, c.ref);
      acao.texto = p.base;
      condicionais.push({ id: `cond_${id.slice('acao_'.length)}`, acao_id: id, pergunta: p.base, se_sim: p.se_sim, se_nao: p.se_nao });
    }
    acoes.push(acao);
  }

  return {
    meta: {
      fonte: 'data/fontes/Matriz_Operacional.xlsx',
      versao_matriz: 'V07',
      leitura_encerra_em: `LEGENDA DE CORES (linha ${marcaFim.linha}, excluída)`,
    },
    fases: FASES,
    setores,
    estagios,
    acoes,
    condicionais,
  };
}

/** JSON estável: ordem determinística, `\n`, indentação fixa, newline final. */
export function serializar(matriz: Matriz): string {
  return JSON.stringify(matriz, null, 2) + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const matriz = lerMatriz();
  writeFileSync(JSON_V07, serializar(matriz), 'utf8');
  console.log(
    `OK gerado data/matriz_v07.json: setores=${matriz.setores.length} estagios=${matriz.estagios.length} ` +
      `celulas=${matriz.acoes.length} if_else=${matriz.condicionais.length}`,
  );
}
