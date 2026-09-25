// Cliente da API de backups (public/api/backups.php) — nesta subetapa só a `config_llm`; as versões chegam na 03.6.
// A ferramenta funciona sem servidor (offline, `localhost` sem PHP, build de arquivo único): toda falha aqui vira “sem servidor”,
// nunca um erro na tela. Mutações levam X-Lux-Requisicao: 1 (a API o exige). A config NUNCA carrega chave de API.
import type { ConfigLlm } from '../llm/config';
import { lerConfig } from '../llm/config';

/** Relativo ao index.html: funciona em /intelligence/ e em qualquer subpasta (base './'). */
export const URL_API_BACKUPS = './api/backups.php';

/** Sem PHP por perto (arquivo aberto do disco): nem tenta. */
const semServidorPossivel = () => typeof location !== 'undefined' && location.protocol === 'file:';

async function pedir(acao: string, init: RequestInit, fetchFn: typeof fetch): Promise<Record<string, unknown> | null> {
  if (semServidorPossivel()) return null;
  try {
    const r = await fetchFn(`${URL_API_BACKUPS}?acao=${acao}`, { credentials: 'same-origin', cache: 'no-store', ...init });
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('application/json')) return null;
    const json: unknown = await r.json();
    return json !== null && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** A config guardada no servidor, se existir e for válida; `null` em qualquer outro caso (o app usa a cópia local ou o padrão). */
export async function lerConfigServidor(fetchFn: typeof fetch = fetch): Promise<ConfigLlm | null> {
  const r = await pedir('config_ler', { method: 'GET' }, fetchFn);
  return r?.existe === true ? lerConfig(r.config) : null;
}

/** `true` se o servidor guardou. Nunca lança. */
export async function gravarConfigServidor(config: ConfigLlm, fetchFn: typeof fetch = fetch): Promise<boolean> {
  const r = await pedir('config_gravar', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lux-Requisicao': '1' }, body: JSON.stringify(config) }, fetchFn);
  return r?.config !== undefined;
}

/** A mais recente vence (`atualizado_em` é ISO 8601). Empate ou data ilegível: fica a local. */
export function maisRecente(local: ConfigLlm, servidor: ConfigLlm | null): ConfigLlm {
  if (!servidor) return local;
  const s = Date.parse(servidor.atualizado_em);
  const l = Date.parse(local.atualizado_em);
  return Number.isFinite(s) && (!Number.isFinite(l) || s > l) ? servidor : local;
}
