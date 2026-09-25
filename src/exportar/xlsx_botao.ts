// Baixa o .xlsx completo. Módulo mínimo: o SheetJS, as bibliotecas e os dados do POP só carregam quando a pessoa clica.
import type { EstadoFpe } from '../estado/armazenamento';
import type { EstadoPop } from '../estado/pop';
import { baixarBytes, MIME } from './baixar';

export const ESCOPO_XLSX = 'planilha com as fichas, as bibliotecas e o POP geral';

export async function baixarPlanilha(estadoFpe: EstadoFpe, estadoPop: EstadoPop, agora: Date = new Date()): Promise<void> {
  const { exportarXlsx } = await import('./xlsx_exportar');
  const { nome, bytes } = await exportarXlsx(estadoFpe, estadoPop, agora);
  baixarBytes(nome, bytes, MIME.xlsx);
}
