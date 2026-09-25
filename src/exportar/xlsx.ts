// Grava a PastaXlsx em .xlsx com o SheetJS 0.20.3 (vendorizado: vendor/xlsx-0.20.3.tgz; o do npm está defasado e vulnerável).
// API confirmada na doc oficial (25/09/2026): utils.aoa_to_sheet, utils.book_new/book_append_sheet, `!cols` (wch), write({type:'array'}).
// O SheetJS só entra no bundle quando a pessoa pede o .xlsx (import dinâmico).
import type { PastaXlsx } from './xlsx_dados';
import { nomeDeAbaValido } from './xlsx_dados';

export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function gerarXlsx(pasta: PastaXlsx, agora: Date = new Date()): Promise<Uint8Array> {
  const invalidas = pasta.abas.filter((a) => !nomeDeAbaValido(a.nome)).map((a) => a.nome);
  if (invalidas.length) throw new Error(`Nome de aba inválido para o Excel: ${invalidas.join(', ')}`);
  const nomes = pasta.abas.map((a) => a.nome.toLowerCase());
  if (new Set(nomes).size !== nomes.length) throw new Error('Há duas abas com o mesmo nome (o Excel não diferencia maiúsculas).');

  const { utils, write } = await import('xlsx');
  const wb = utils.book_new();
  wb.Props = { Title: pasta.titulo, Author: pasta.autor, CreatedDate: agora };
  for (const a of pasta.abas) {
    // cabeçalho, dados, uma linha em branco e a nota; todo valor é string → célula de texto (nunca fórmula)
    const ws = utils.aoa_to_sheet([a.colunas, ...a.linhas, [], [pasta.nota]]);
    ws['!cols'] = a.larguras.map((wch) => ({ wch }));
    utils.book_append_sheet(wb, ws, a.nome);
  }
  return new Uint8Array(write(wb, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer);
}
