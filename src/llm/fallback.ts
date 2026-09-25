// Fallback determinístico (03.3): sem LLM, o POP sai do mesmo jeito. O texto é o da resposta que já está no template/edição.
import type { EntradaRedacao } from './prompt';

export type MotivoFallback =
  | 'desativado'
  | 'sem_consentimento'
  | 'sem_chave'
  | 'sem_modelo'
  | 'teto'
  | 'limite_diario'
  | 'sem_credito'
  | 'chave_invalida'
  | 'todos_falharam';

export const fallbackDeterministico = (e: EntradaRedacao): string => e.resposta;

/** Aviso para a pessoa: o que aconteceu e o que o app fez. Nunca menciona chave nem detalhe técnico do provedor. */
export const MENSAGEM_FALLBACK: Record<MotivoFallback, string> = {
  desativado: 'A redação com IA não está disponível nesta versão. O texto continua o mesmo.',
  sem_consentimento: 'Marque a ciência de envio ao provedor externo para usar a IA. Nenhum texto foi enviado.',
  sem_chave: 'Não há chave de IA configurada. O texto continua o mesmo.',
  sem_modelo: 'Informe o modelo da sua chave particular. O texto continua o mesmo.',
  teto: 'O teto de gasto da IA foi atingido. Nenhuma chamada foi feita e o texto continua o mesmo.',
  limite_diario: 'O limite diário de chamadas da IA foi atingido. Tente amanhã; o texto continua o mesmo.',
  sem_credito: 'O provedor recusou por falta de crédito. Nenhum novo envio foi tentado; o texto continua o mesmo.',
  chave_invalida: 'O provedor não aceitou a chave. Confira a chave; o texto continua o mesmo.',
  todos_falharam: 'Os modelos de IA não responderam agora. O texto continua o mesmo; tente de novo em alguns minutos.',
};
