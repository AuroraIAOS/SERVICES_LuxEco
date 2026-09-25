// Estado da tela POP guardado no navegador (localStorage): só as respostas editadas das perguntas estratégicas. Nada aqui depende do React.
// Mesmas regras do FPE (armazenamento.ts): storage pode faltar ou lançar; o que está guardado é validado antes de usar;
// JSON ilegível vira estado vazio COM cópia; responder igual à resposta-padrão desfaz a edição.
// O backup (03.5) embute este mesmo objeto ao lado do estado do FPE.
import { z } from 'zod';
import type { ArmazenamentoTexto } from './armazenamento';
import { armazenamentoDoNavegador } from './armazenamento';

export const CHAVE_POP = 'lux_pop_estado_v1';
/** cópia do texto ilegível, guardada antes de qualquer regravação (nunca apagar em silêncio). */
export const CHAVE_POP_INVALIDO = `${CHAVE_POP}_invalido`;
export const SCHEMA_VERSAO_POP = 1;

const esquemaResposta = z.object({ texto: z.string(), origem: z.literal('manual'), atualizado_em: z.string() });
export const esquemaEstadoPop = z.object({ schema_versao: z.literal(SCHEMA_VERSAO_POP), pop_respostas: z.record(z.string(), esquemaResposta) });

export interface RespostaEditada {
  texto: string;
  origem: 'manual';
  atualizado_em: string;
}

export interface EstadoPop {
  schema_versao: typeof SCHEMA_VERSAO_POP;
  /** só o que difere da resposta-padrão, por `pergunta.id`. */
  pop_respostas: Record<string, RespostaEditada>;
}

export const estadoPopVazio = (): EstadoPop => ({ schema_versao: SCHEMA_VERSAO_POP, pop_respostas: {} });

export type OrigemDaLeituraPop = 'armazenamento' | 'vazio' | 'corrompido' | 'indisponivel';

export function lerEstadoPop(storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): { estado: EstadoPop; origem: OrigemDaLeituraPop } {
  if (!storage) return { estado: estadoPopVazio(), origem: 'indisponivel' };
  let bruto: string | null;
  try {
    bruto = storage.getItem(CHAVE_POP);
  } catch {
    return { estado: estadoPopVazio(), origem: 'indisponivel' };
  }
  if (bruto === null) return { estado: estadoPopVazio(), origem: 'vazio' };
  try {
    const lido = esquemaEstadoPop.safeParse(JSON.parse(bruto));
    if (lido.success) return { estado: lido.data as EstadoPop, origem: 'armazenamento' };
  } catch {
    // cai no tratamento de corrompido abaixo
  }
  try {
    storage.setItem(CHAVE_POP_INVALIDO, bruto);
  } catch {
    // sem espaço para a cópia: segue com o estado vazio mesmo assim
  }
  return { estado: estadoPopVazio(), origem: 'corrompido' };
}

/** `true` se gravou; `false` se o navegador recusou (cota cheia, modo privado). O estado em memória continua valendo. */
export function gravarEstadoPop(estado: EstadoPop, storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(CHAVE_POP, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}

/** Registra a resposta de uma pergunta (imutável). Texto igual ao padrão desfaz a edição; texto vazio é uma edição válida (a tela avisa). */
export function editarResposta(estado: EstadoPop, perguntaId: string, padrao: string, texto: string, agora: string): EstadoPop {
  const { [perguntaId]: _anterior, ...resto } = estado.pop_respostas;
  if (texto === padrao) return _anterior === undefined ? estado : { ...estado, pop_respostas: resto };
  return { ...estado, pop_respostas: { ...resto, [perguntaId]: { texto, origem: 'manual', atualizado_em: agora } } };
}

/** Volta a pergunta à resposta-padrão. */
export function restaurarResposta(estado: EstadoPop, perguntaId: string): EstadoPop {
  if (!(perguntaId in estado.pop_respostas)) return estado;
  const { [perguntaId]: _removida, ...resto } = estado.pop_respostas;
  return { ...estado, pop_respostas: resto };
}

/** `{ pergunta.id: texto }` para o gerador (`EntradaPop.respostas`). */
export const respostasDoEstado = (estado: EstadoPop): Record<string, string> => Object.fromEntries(Object.entries(estado.pop_respostas).map(([id, r]) => [id, r.texto]));
