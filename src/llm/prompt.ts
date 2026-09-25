// Prompt fixo e validação da saída (03.3). O LLM só REDIGE o que já está nos documentos: não acrescenta fato, número, prazo,
// valor ou nome. O prompt pede isso; `validarSaida` garante em código o que dá para garantir (números, R$, prazos, marcação).
import type { Mensagem } from './cliente';

export interface EntradaRedacao {
  /** a pergunta do POP (contexto). */
  pergunta: string;
  /** a resposta atual: é o ÚNICO conteúdo que o modelo pode usar. */
  resposta: string;
}

export const TAMANHO_MAXIMO_SAIDA = 800;

export const PROMPT_SISTEMA = [
  'Você redige textos de Procedimentos Operacionais Padrão (POP) de uma empresa de energia solar.',
  'Reescreva a resposta fornecida em português do Brasil, em texto curto, claro e no imperativo ou na terceira pessoa objetiva.',
  'Use SOMENTE o conteúdo fornecido. Não acrescente fatos, números, prazos, valores em reais, nomes de pessoas ou de empresas, nem dados de contato.',
  'Se algo não estiver no texto fornecido, não invente: mantenha como está.',
  'Responda apenas com o texto final, sem título, lista, tabela, HTML ou marcação.',
].join(' ');

export function montarMensagens(e: EntradaRedacao): Mensagem[] {
  return [
    { role: 'system', content: PROMPT_SISTEMA },
    { role: 'user', content: `Pergunta do POP: ${e.pergunta}\n\nResposta a reescrever:\n${e.resposta}` },
  ];
}

const SEM_CIFRA = /R\$\s*\d/;
const SEM_PRAZO = /\b\d+\s*(?:dias?|horas?|minutos?|semanas?|meses|mês)\b/i;
const MARCACAO = /<\/?[a-z][^>]*>|```/i;
const numerosDe = (t: string) => new Set(t.match(/\d+/g) ?? []);

export type SaidaValidada = { ok: true; texto: string } | { ok: false; motivo: 'vazia' | 'longa' | 'cifra' | 'prazo' | 'numero_novo' | 'marcacao' };

/** Recusa o que o modelo não pode ter feito: texto grande, R$, prazo, número que não estava na entrada, HTML/markdown de código. */
export function validarSaida(entrada: EntradaRedacao, bruto: string): SaidaValidada {
  const texto = bruto.replace(/\r\n?/g, '\n').trim();
  if (texto === '') return { ok: false, motivo: 'vazia' };
  if (texto.length > TAMANHO_MAXIMO_SAIDA) return { ok: false, motivo: 'longa' };
  if (MARCACAO.test(texto)) return { ok: false, motivo: 'marcacao' };
  if (SEM_CIFRA.test(texto)) return { ok: false, motivo: 'cifra' };
  if (SEM_PRAZO.test(texto)) return { ok: false, motivo: 'prazo' };
  const permitidos = numerosDe(`${entrada.pergunta} ${entrada.resposta}`);
  for (const n of numerosDe(texto)) if (!permitidos.has(n)) return { ok: false, motivo: 'numero_novo' };
  return { ok: true, texto };
}
