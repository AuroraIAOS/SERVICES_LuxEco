// Exporta o .xlsx completo (FPE + bibliotecas + POP geral) com os valores EM VIGOR: fichas com as edições do FPE e o POP com
// as respostas editadas. Carregado só quando a pessoa clica em “.xlsx” (junta os dados do POP, as bibliotecas e o SheetJS).
import { BIBLIOTECAS } from '../dados/bibliotecas';
import { DOCUMENTO_FICHAS } from '../dados/fichas';
import { MATRIZ_V08 } from '../dados/matriz';
import { PERGUNTAS_POP, POP_OBSERVACOES, POP_TEMPLATES } from '../dados/pop';
import type { EstadoFpe } from '../estado/armazenamento';
import type { EstadoPop } from '../estado/pop';
import { respostasDoEstado } from '../estado/pop';
import { gerarPop } from '../pop/gerar';
import { montarFpe } from '../telas/fpe/modelo';
import { nomeArquivoXlsx } from './baixar';
import { gerarXlsx } from './xlsx';
import { montarPastaXlsx } from './xlsx_dados';

export async function exportarXlsx(estadoFpe: EstadoFpe, estadoPop: EstadoPop, agora: Date): Promise<{ nome: string; bytes: Uint8Array }> {
  const fpe = montarFpe(MATRIZ_V08, DOCUMENTO_FICHAS, estadoFpe);
  const popGeral = gerarPop({ tipo: 'geral' }, { v08: MATRIZ_V08, fpe, bibliotecas: BIBLIOTECAS, perguntas: PERGUNTAS_POP.perguntas, templates: POP_TEMPLATES, observacoes: POP_OBSERVACOES, respostas: respostasDoEstado(estadoPop) });
  const pasta = montarPastaXlsx({ v08: MATRIZ_V08, fpe, bibliotecas: BIBLIOTECAS, templates: POP_TEMPLATES, popGeral });
  return { nome: nomeArquivoXlsx(agora), bytes: await gerarXlsx(pasta, agora) };
}
