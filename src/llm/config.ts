// Configuração do LLM (`config_llm`, docs/02): teto de gasto, alerta, limite diário e a lista de modelos (principal + reservas).
// NUNCA contém chave de API: o esquema é `strict`, então qualquer campo extra (inclusive um campo de chave) é recusado ao ler e ao gravar.
// Puro (sem React, sem rede). Persistência: src/llm/armazenamento.ts.
import { z } from 'zod';

export const SCHEMA_VERSAO_LLM = 1;
/** Teto de sanidade do painel: valores acima disso são recusados (docs/00 §03.3). */
export const TETO_SANIDADE_BRL = 10_000;
export const MAX_MODELOS = 3;
export const LIMITE_DIARIO_MAXIMO = 100_000;

/** id do OpenRouter: “provedor/modelo” com sufixo opcional (`:free`). */
const ID_MODELO = /^[a-z0-9][\w.-]*\/[\w.-]+(?::[\w.-]+)?$/i;
export const ehIdDeModelo = (s: string) => ID_MODELO.test(s);
export const ehModeloGratuito = (s: string) => ehIdDeModelo(s) && s.endsWith(':free');

const numeroNaoNegativo = z.number().finite().min(0);

export const esquemaConfigLlm = z
  .object({
    schema_versao: z.literal(SCHEMA_VERSAO_LLM),
    teto_mensal_brl: numeroNaoNegativo.max(TETO_SANIDADE_BRL),
    alerta_percentual: z.number().min(1).max(100),
    limite_diario_requisicoes: z.number().int().min(0).max(LIMITE_DIARIO_MAXIMO),
    modelos: z.array(z.string().refine(ehModeloGratuito, 'use ids :free do OpenRouter')).min(1).max(MAX_MODELOS),
    preco_entrada_brl_por_milhao: numeroNaoNegativo.optional(),
    preco_saida_brl_por_milhao: numeroNaoNegativo.optional(),
    atualizado_em: z.string(),
  })
  .strict();

export type ConfigLlm = z.infer<typeof esquemaConfigLlm>;

/** Lê e valida uma config vinda de fora (localStorage, servidor). `null` = inválida. */
export function lerConfig(bruto: unknown): ConfigLlm | null {
  const r = esquemaConfigLlm.safeParse(bruto);
  return r.success ? r.data : null;
}

export interface PadroesLlm {
  tetoMensalBrl: number;
  alertaPercentual: number;
  limiteDiario: number;
  modelos: string[];
}

export function configPadrao(padroes: PadroesLlm, agora: string): ConfigLlm {
  return {
    schema_versao: SCHEMA_VERSAO_LLM,
    teto_mensal_brl: padroes.tetoMensalBrl,
    alerta_percentual: padroes.alertaPercentual,
    limite_diario_requisicoes: padroes.limiteDiario,
    modelos: padroes.modelos.slice(0, MAX_MODELOS),
    atualizado_em: agora,
  };
}

/** Modelos sem repetição, só ids válidos, no máximo 3 (a ordem é a prioridade do failover). */
export function normalizarModelos(entrada: readonly string[]): string[] {
  return [...new Set(entrada.map((m) => m.trim()).filter(ehModeloGratuito))].slice(0, MAX_MODELOS);
}
