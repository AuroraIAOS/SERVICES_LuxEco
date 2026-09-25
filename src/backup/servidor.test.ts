// @vitest-environment node
// Cliente da API (só config_llm nesta subetapa): fala com a API quando há, some em silêncio quando não há.
import { describe, expect, it } from 'vitest';
import type { ConfigLlm } from '../llm/config';
import { gravarConfigServidor, lerConfigServidor, maisRecente, URL_API_BACKUPS } from './servidor';

const CONFIG: ConfigLlm = { schema_versao: 1, teto_mensal_brl: 0, alerta_percentual: 95, limite_diario_requisicoes: 50, modelos: ['a/b:free', 'c/d:free'], atualizado_em: '2026-09-25T10:00:00.000Z' };
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

function falso(resposta: () => Response | Promise<Response>) {
  const chamadas: { url: string; init?: RequestInit }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    chamadas.push({ url, init });
    return resposta();
  }) as unknown as typeof fetch;
  return { chamadas, fetchFn };
}

describe('lerConfigServidor', () => {
  it('devolve a config guardada, chamando config_ler por GET', async () => {
    const f = falso(() => json({ existe: true, config: CONFIG }));
    expect(await lerConfigServidor(f.fetchFn)).toEqual(CONFIG);
    expect(f.chamadas[0]!.url).toBe(`${URL_API_BACKUPS}?acao=config_ler`);
    expect(f.chamadas[0]!.init?.method).toBe('GET');
  });

  it.each([
    ['ainda não existe', () => json({ existe: false, config: null })],
    ['401 (sem senha)', () => json({ erro: 'nao_autenticado' }, 401)],
    ['404 (dev sem PHP)', () => new Response('nada', { status: 404 })],
    ['a página do app no lugar da API (HTML)', () => new Response('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
    ['JSON que não é objeto', () => json([1, 2])],
    ['config inválida no servidor (chave de API)', () => json({ existe: true, config: { ...CONFIG, api_key: 'x' } })],
    ['config com faixa errada', () => json({ existe: true, config: { ...CONFIG, teto_mensal_brl: 99999 } })],
  ])('%s → null, sem lançar', async (_nome, resposta) => {
    expect(await lerConfigServidor(falso(resposta).fetchFn)).toBeNull();
  });

  it('rede caindo → null', async () => {
    const f = falso(() => {
      throw new TypeError('Failed to fetch');
    });
    expect(await lerConfigServidor(f.fetchFn)).toBeNull();
  });
});

describe('gravarConfigServidor', () => {
  it('envia o JSON com X-Lux-Requisicao: 1 e Content-Type JSON; true quando o servidor guardou', async () => {
    const f = falso(() => json({ config: CONFIG }));
    expect(await gravarConfigServidor(CONFIG, f.fetchFn)).toBe(true);
    const { url, init } = f.chamadas[0]!;
    expect(url).toBe(`${URL_API_BACKUPS}?acao=config_gravar`);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'X-Lux-Requisicao': '1', 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init?.body))).toEqual(CONFIG);
  });

  it('o corpo enviado nunca traz chave de API', async () => {
    const f = falso(() => json({ config: CONFIG }));
    await gravarConfigServidor(CONFIG, f.fetchFn);
    expect(String(f.chamadas[0]!.init?.body)).not.toMatch(/api_key|apiKey|chave|sk-/i);
  });

  it.each([
    ['422', () => json({ erro: 'config_invalida' }, 422)],
    ['403', () => json({ erro: 'requisicao_nao_confiavel' }, 403)],
    ['401', () => json({ erro: 'nao_autenticado' }, 401)],
    ['HTML', () => new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
  ])('%s → false, sem lançar', async (_n, resposta) => {
    expect(await gravarConfigServidor(CONFIG, falso(resposta).fetchFn)).toBe(false);
  });

  it('rede caindo → false', async () => {
    const f = falso(() => {
      throw new TypeError('Failed to fetch');
    });
    expect(await gravarConfigServidor(CONFIG, f.fetchFn)).toBe(false);
  });
});

describe('maisRecente', () => {
  it('a mais nova vence; sem servidor, empate ou data ilegível fica a local', () => {
    const nova = { ...CONFIG, teto_mensal_brl: 5, atualizado_em: '2026-09-26T10:00:00.000Z' };
    expect(maisRecente(CONFIG, nova)).toBe(nova);
    expect(maisRecente(nova, CONFIG)).toBe(nova);
    expect(maisRecente(CONFIG, null)).toBe(CONFIG);
    expect(maisRecente(CONFIG, { ...CONFIG, teto_mensal_brl: 7 })).toBe(CONFIG);
    expect(maisRecente(CONFIG, { ...nova, atualizado_em: 'ontem' })).toBe(CONFIG);
    expect(maisRecente({ ...CONFIG, atualizado_em: 'ontem' }, nova)).toBe(nova);
  });
});
