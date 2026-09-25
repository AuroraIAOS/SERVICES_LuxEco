// Exportação e importação do estado do FPE em JSON: a “memória exportável”. Puro (sem DOM).
// O arquivo leva o carimbo (formato, versão do formato, data, versão da Matriz) e o MESMO estado guardado no navegador
// (`estado`), validado pelo mesmo esquema Zod. Exportar → importar devolve um estado idêntico.
import type { DocumentoFichas } from '../dados/tipos';
import type { EstadoFpe } from '../estado/armazenamento';
import { esquemaEstado, SCHEMA_VERSAO } from '../estado/armazenamento';
import { NOME_APP } from '../ui/identidade';

export const FORMATO_JSON = 'lux_fpe_exportacao';
export const FORMATO_VERSAO = 1;
/** Acima disso o arquivo não é uma exportação do FPE (a maior, com as 236 fichas editadas, tem poucas centenas de kB). */
export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

export interface ExportacaoJson {
  formato: typeof FORMATO_JSON;
  formato_versao: typeof FORMATO_VERSAO;
  exportado_em: string;
  app: string;
  versao_matriz: string;
  resumo: { fichas_total: number; fichas_editadas: number };
  estado: EstadoFpe;
}

/** Só as edições (o que difere do padrão): as fichas originais continuam nos dados versionados da ferramenta. */
export function exportarJson(estado: EstadoFpe, doc: DocumentoFichas, agora: Date): string {
  const saida: ExportacaoJson = {
    formato: FORMATO_JSON,
    formato_versao: FORMATO_VERSAO,
    exportado_em: agora.toISOString(),
    app: NOME_APP,
    versao_matriz: doc.meta.versao_matriz,
    resumo: { fichas_total: doc.fichas.length, fichas_editadas: Object.keys(estado.fpe_edicoes).length },
    estado,
  };
  return `${JSON.stringify(saida, null, 2)}\n`;
}

export type ResultadoImportacao =
  | { ok: true; estado: EstadoFpe; exportadoEm: string; versaoMatriz: string; /** ids de ficha do arquivo que a ferramenta não tem mais. */ ignoradas: string[] }
  | { ok: false; erro: string };

const falha = (erro: string): ResultadoImportacao => ({ ok: false, erro });

export function importarJson(texto: string, doc: DocumentoFichas): ResultadoImportacao {
  if (texto.length > TAMANHO_MAXIMO_BYTES) return falha('O arquivo é grande demais para ser uma exportação do FPE.');
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return falha('O arquivo não é um JSON válido.');
  }
  if (typeof bruto !== 'object' || bruto === null) return falha('Este arquivo não é uma exportação do FPE da Lux.');
  const arquivo = bruto as Record<string, unknown>;
  if (arquivo.formato !== FORMATO_JSON) return falha('Este arquivo não é uma exportação do FPE da Lux.');
  if (typeof arquivo.formato_versao !== 'number' || arquivo.formato_versao > FORMATO_VERSAO) {
    return falha('Este arquivo foi feito por uma versão mais nova da ferramenta. Atualize a ferramenta antes de importar.');
  }
  const lido = esquemaEstado.safeParse(arquivo.estado);
  if (!lido.success || lido.data.schema_versao !== SCHEMA_VERSAO) return falha('As edições guardadas no arquivo estão fora do formato esperado.');

  const existentes = new Set(doc.fichas.map((f) => f.id));
  const edicoes: EstadoFpe['fpe_edicoes'] = {};
  const ignoradas: string[] = [];
  for (const [id, edicao] of Object.entries(lido.data.fpe_edicoes)) {
    if (existentes.has(id)) edicoes[id] = edicao as EstadoFpe['fpe_edicoes'][string];
    else ignoradas.push(id);
  }
  return {
    ok: true,
    estado: { schema_versao: SCHEMA_VERSAO, fpe_edicoes: edicoes },
    exportadoEm: typeof arquivo.exportado_em === 'string' ? arquivo.exportado_em : '',
    versaoMatriz: typeof arquivo.versao_matriz === 'string' ? arquivo.versao_matriz : '',
    ignoradas,
  };
}
