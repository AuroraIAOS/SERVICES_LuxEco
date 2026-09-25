// Monta o backup com os dados reais da ferramenta. Carregado só quando a pessoa clica em “Salvar versão”/“Baixar arquivo”
// (junta as fichas, as bibliotecas e os dados do POP).
import { BIBLIOTECAS } from '../dados/bibliotecas';
import { DOCUMENTO_FICHAS } from '../dados/fichas';
import { MATRIZ_V08 } from '../dados/matriz';
import { PERGUNTAS_POP, POP_OBSERVACOES, POP_TEMPLATES } from '../dados/pop';
import type { EstadoFpe } from '../estado/armazenamento';
import type { EstadoPop } from '../estado/pop';
import { montarFpe } from '../telas/fpe/modelo';
import type { EscopoBackup } from './estado';
import { gerarHtmlBackup, tamanhoEmBytes, TAMANHO_MAXIMO_BACKUP } from './gerar_html';

/** Versão da ferramenta gravada em cada backup (a versão da Matriz que ela traz; a API só aceita letras, números e . _ + -). */
export const VERSAO_APP = /^[0-9A-Za-z._+-]{1,32}$/.test(MATRIZ_V08.meta.versao_matriz) ? MATRIZ_V08.meta.versao_matriz : 'desconhecida';

export interface BackupPronto {
  html: string;
  bytes: number;
  /** o HTML passa do que a API aceita. */
  grandeDemais: boolean;
  versaoApp: string;
}

export function montarBackup(escopo: EscopoBackup, rotulo: string, fpeEstado: EstadoFpe, popEstado: EstadoPop, agora: Date): BackupPronto {
  const html = gerarHtmlBackup({
    escopo,
    rotulo,
    versaoApp: VERSAO_APP,
    agora,
    fpeEstado,
    popEstado,
    fpe: montarFpe(MATRIZ_V08, DOCUMENTO_FICHAS, fpeEstado),
    v08: MATRIZ_V08,
    bibliotecas: BIBLIOTECAS,
    perguntas: PERGUNTAS_POP.perguntas,
    templates: POP_TEMPLATES,
    observacoes: POP_OBSERVACOES,
  });
  const bytes = tamanhoEmBytes(html);
  return { html, bytes, grandeDemais: bytes > TAMANHO_MAXIMO_BACKUP, versaoApp: VERSAO_APP };
}

/** O que existe hoje: o que sobrou de versões antigas é ignorado ao restaurar. */
export const IDS_EXISTENTES = {
  fichaIds: new Set(DOCUMENTO_FICHAS.fichas.map((f) => f.id)),
  perguntaIds: new Set(PERGUNTAS_POP.perguntas.map((p) => p.id)),
};
