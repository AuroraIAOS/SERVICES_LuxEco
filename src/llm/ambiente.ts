// Padrões do LLM que vêm do .env em tempo de build (03.3). Tudo aqui pode ser público (VITE_*) ou é só o VALOR PADRÃO do
// teto/alerta (LLM_*, embutidos por vite.config.ts). Nenhum teto fixo em código: o contratante o altera no painel.
// FTP e SMOKE nunca passam por aqui.
import modelosJson from '../../data/conteudo/llm_modelos.json' with { type: 'json' };
import type { PadroesLlm } from './config';
import { ehModeloGratuito, MAX_MODELOS } from './config';

export interface Ambiente {
  /** chave OpenRouter dedicada, sem saldo (pendência vigiada: fica no bundle público). Vazia = LLM padrão indisponível. */
  chave: string;
  /** o nome do app no OpenRouter (cabeçalho X-Title). */
  titulo: string;
  padroes: PadroesLlm;
  /** `false` no build de arquivo único (modo single): a IA fica desativada. */
  llmDisponivel: boolean;
}

/** Placeholders do .env (`[provedor/modelo]:free`, `sk-or-v1-...`) contam como “não preenchido”. */
const preenchido = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && !/[[\]]|\.\.\./.test(v);

function numero(v: unknown, padrao: number, minimo: number, maximo: number): number {
  const n = typeof v === 'string' ? Number(v.trim().replace(',', '.')) : Number.NaN;
  return Number.isFinite(n) && n >= minimo && n <= maximo ? n : padrao;
}

/** Lista padrão: `VITE_OPENROUTER_MODELO_PADRAO` (se for um id :free válido) vira o principal; as reservas vêm do JSON versionado. */
export function modelosPadrao(vite: Record<string, unknown>): string[] {
  const doArquivo = (modelosJson.modelos as string[]).filter(ehModeloGratuito);
  const escolhido = vite.VITE_OPENROUTER_MODELO_PADRAO;
  const principal = preenchido(escolhido) && ehModeloGratuito(escolhido.trim()) ? [escolhido.trim()] : [];
  return [...new Set([...principal, ...doArquivo])].slice(0, MAX_MODELOS);
}

const embutido = (nome: '__LLM_TETO_MENSAL_BRL__' | '__LLM_ALERTA_EM_PERCENTUAL__') => {
  try {
    return nome === '__LLM_TETO_MENSAL_BRL__' ? (typeof __LLM_TETO_MENSAL_BRL__ === 'string' ? __LLM_TETO_MENSAL_BRL__ : undefined) : typeof __LLM_ALERTA_EM_PERCENTUAL__ === 'string' ? __LLM_ALERTA_EM_PERCENTUAL__ : undefined;
  } catch {
    return undefined;
  }
};

export function lerAmbiente(vite: Record<string, unknown> = import.meta.env as Record<string, unknown>, teto = embutido('__LLM_TETO_MENSAL_BRL__'), alerta = embutido('__LLM_ALERTA_EM_PERCENTUAL__')): Ambiente {
  const chave = vite.VITE_OPENROUTER_API_KEY;
  return {
    chave: preenchido(chave) ? chave.trim() : '',
    titulo: preenchido(vite.VITE_OPENROUTER_API_NAME) ? String(vite.VITE_OPENROUTER_API_NAME).trim() : 'Lux Ferramentas Operacionais',
    padroes: {
      tetoMensalBrl: numero(teto, 0, 0, 10_000),
      alertaPercentual: Math.round(numero(alerta, 95, 1, 100)),
      limiteDiario: Math.round(numero(vite.VITE_LLM_LIMITE_DIARIO_FREE, 50, 0, 100_000)),
      modelos: modelosPadrao(vite),
    },
    llmDisponivel: vite.MODE !== 'single',
  };
}
