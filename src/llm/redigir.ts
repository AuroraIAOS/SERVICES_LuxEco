// Redação com IA e failover (03.3). Ordem de tudo: consentimento → chave → para cada modelo (máx. 3): pausa? teto/limite? chamada.
// Nada trava: qualquer falha termina no fallback determinístico. Sem consentimento, NENHUMA chamada sai.
// Failover feito no cliente (e não pelo parâmetro `models` do OpenRouter) porque só assim cada tentativa conta na cota do dia,
// o modelo com falha entra em pausa e o teto é checado ANTES de cada chamada.
import type { ConfigLlm } from './config';
import type { ErroLlm } from './cliente';
import { chamarModelo, erroDefinitivo } from './cliente';
import type { MotivoFallback } from './fallback';
import { fallbackDeterministico } from './fallback';
import type { ModoLlm, UsoLlm } from './limite_gasto';
import { decidirChamada, registrarRequisicao, registrarTokens } from './limite_gasto';
import type { EntradaRedacao } from './prompt';
import { montarMensagens, validarSaida } from './prompt';

/** modelo → instante (ms) até quando fica em pausa. Só em memória: recarregar a página zera. */
export type Pausas = Record<string, number>;
export const PAUSA_PADRAO_MS = 10 * 60 * 1000;

export interface ContextoLlm {
  config: ConfigLlm;
  uso: UsoLlm;
  pausas: Pausas;
  modo: ModoLlm;
  /** chave: a padrão do .env ou a particular (só na memória da sessão). */
  chave: string;
  /** só no modo particular: o modelo e a URL (https) da chave do contratante. */
  modeloParticular?: string;
  urlParticular?: string;
  consentimento: boolean;
  agora?: () => Date;
  fetchFn?: typeof fetch;
  pausaMs?: number;
  timeoutMs?: number;
  titulo?: string;
}

export interface Tentativa {
  modelo: string;
  resultado: 'ok' | ErroLlm | 'saida_invalida';
}

export interface ResultadoRedacao {
  origem: 'llm' | 'fallback';
  /** o texto redigido (llm) ou o texto original (fallback). */
  texto: string;
  modelo?: string;
  motivo?: MotivoFallback;
  /** estado novo (imutável): o chamador guarda. */
  uso: UsoLlm;
  pausas: Pausas;
  tentativas: Tentativa[];
}

export const MAX_TENTATIVAS = 3;

export async function redigirCampo(entrada: EntradaRedacao, ctx: ContextoLlm): Promise<ResultadoRedacao> {
  const agora = ctx.agora ?? (() => new Date());
  let uso = ctx.uso;
  let pausas = ctx.pausas;
  const tentativas: Tentativa[] = [];
  const fallback = (motivo: MotivoFallback): ResultadoRedacao => ({ origem: 'fallback', texto: fallbackDeterministico(entrada), motivo, uso, pausas, tentativas });

  if (!ctx.consentimento) return fallback('sem_consentimento');
  if (ctx.chave.trim() === '') return fallback('sem_chave');
  const modelos = ctx.modo === 'padrao' ? ctx.config.modelos : ctx.modeloParticular?.trim() ? [ctx.modeloParticular.trim()] : [];
  if (modelos.length === 0) return fallback('sem_modelo');

  for (const modelo of modelos.slice(0, MAX_TENTATIVAS)) {
    if ((pausas[modelo] ?? 0) > agora().getTime()) continue; // em pausa: não gasta cota tentando de novo
    const decisao = decidirChamada(ctx.config, uso, ctx.modo, agora());
    if (!decisao.permitido) return fallback(decisao.motivo);

    uso = registrarRequisicao(uso, agora());
    const r = await chamarModelo({ chave: ctx.chave, modelo, mensagens: montarMensagens(entrada), url: ctx.modo === 'particular' ? ctx.urlParticular : undefined, fetchFn: ctx.fetchFn, timeoutMs: ctx.timeoutMs, titulo: ctx.titulo });

    if (r.ok) {
      uso = registrarTokens(uso, ctx.config, ctx.modo, r.tokens_entrada, r.tokens_saida, agora());
      const saida = validarSaida(entrada, r.texto);
      if (saida.ok) {
        tentativas.push({ modelo, resultado: 'ok' });
        return { origem: 'llm', texto: saida.texto, modelo, uso, pausas, tentativas };
      }
      tentativas.push({ modelo, resultado: 'saida_invalida' }); // o modelo inventou: tenta o próximo, sem pausar
      continue;
    }

    tentativas.push({ modelo, resultado: r.erro });
    if (r.erro === 'sem_credito') return fallback('sem_credito'); // 402: sem retry e sem tentar outro modelo
    if (r.erro === 'chave_invalida') return fallback('chave_invalida');
    if (!erroDefinitivo(r.erro)) pausas = { ...pausas, [modelo]: agora().getTime() + (ctx.pausaMs ?? PAUSA_PADRAO_MS) };
  }
  return fallback('todos_falharam');
}
