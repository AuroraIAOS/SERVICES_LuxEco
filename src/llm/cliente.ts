// Cliente do OpenRouter (03.3): uma chamada, um modelo. API confirmada na doc oficial (search-first, 25/09/2026):
// POST https://openrouter.ai/api/v1/chat/completions, `Authorization: Bearer`, resposta `choices[0].message.content` e
// `usage.prompt_tokens/completion_tokens`. Erros: 401 chave, 402 sem crédito, 404 modelo, 429 limite, 5xx provedor.
// A chave só vai no cabeçalho; este módulo não escreve em log, console nem exceção. A saída é sempre TEXTO (string).
export const URL_OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
export const TEMPO_LIMITE_MS = 30_000;

export interface Mensagem {
  role: 'system' | 'user';
  content: string;
}

export type ErroLlm = 'chave_invalida' | 'sem_credito' | 'limite' | 'modelo_indisponivel' | 'servidor' | 'tempo' | 'rede' | 'vazio' | 'http';

export type ResultadoChamada =
  | { ok: true; texto: string; tokens_entrada: number; tokens_saida: number; modelo: string }
  | { ok: false; erro: ErroLlm; status?: number };

export interface OpcoesChamada {
  chave: string;
  modelo: string;
  mensagens: Mensagem[];
  url?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  /** identifica o app no OpenRouter (opcional). */
  titulo?: string;
}

/** Só https: uma URL particular nunca leva a chave em texto claro. */
export const ehUrlSegura = (url: string) => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

/** 402 e 401 encerram tudo (tentar outro modelo não muda nada); os demais deixam o failover seguir. */
export const erroDefinitivo = (e: ErroLlm) => e === 'sem_credito' || e === 'chave_invalida';

function erroDoStatus(status: number): ErroLlm {
  if (status === 401 || status === 403) return 'chave_invalida';
  if (status === 402) return 'sem_credito';
  if (status === 404) return 'modelo_indisponivel';
  if (status === 408) return 'tempo';
  if (status === 429) return 'limite';
  if (status >= 500) return 'servidor';
  return 'http';
}

const inteiro = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.round(x) : 0);

export async function chamarModelo(o: OpcoesChamada): Promise<ResultadoChamada> {
  const url = o.url ?? URL_OPENROUTER;
  if (!ehUrlSegura(url)) return { ok: false, erro: 'http' };
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), o.timeoutMs ?? TEMPO_LIMITE_MS);
  try {
    const resposta = await (o.fetchFn ?? fetch)(url, {
      method: 'POST',
      signal: controle.signal,
      headers: { Authorization: `Bearer ${o.chave}`, 'Content-Type': 'application/json', ...(o.titulo ? { 'X-Title': o.titulo } : {}) },
      body: JSON.stringify({ model: o.modelo, messages: o.mensagens, temperature: 0.2, max_tokens: 600 }),
    });
    if (!resposta.ok) return { ok: false, erro: erroDoStatus(resposta.status), status: resposta.status };
    const corpo: unknown = await resposta.json().catch(() => null);
    const c = corpo as { error?: { code?: unknown }; choices?: { message?: { content?: unknown }; finish_reason?: unknown }[]; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } } | null;
    // O OpenRouter pode responder 200 com um objeto `error` (falha do provedor no meio do caminho).
    if (c?.error) return { ok: false, erro: typeof c.error.code === 'number' ? erroDoStatus(c.error.code) : 'servidor' };
    const escolha = c?.choices?.[0];
    if (escolha?.finish_reason === 'error') return { ok: false, erro: 'servidor' };
    const conteudo = escolha?.message?.content;
    if (typeof conteudo !== 'string' || conteudo.trim() === '') return { ok: false, erro: 'vazio' };
    return { ok: true, texto: conteudo, tokens_entrada: inteiro(c?.usage?.prompt_tokens), tokens_saida: inteiro(c?.usage?.completion_tokens), modelo: o.modelo };
  } catch (e) {
    return { ok: false, erro: e instanceof DOMException && e.name === 'AbortError' ? 'tempo' : 'rede' };
  } finally {
    clearTimeout(relogio);
  }
}
