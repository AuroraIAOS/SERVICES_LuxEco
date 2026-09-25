// @vitest-environment node
// Redação com IA (03.3): failover entre 3 modelos, pausa, consentimento, 402/429/404/timeout, chave particular e fallback.
import { describe, expect, it } from 'vitest';
import { chamarModelo } from './cliente';
import type { ConfigLlm } from './config';
import { configPadrao } from './config';
import { MENSAGEM_FALLBACK } from './fallback';
import { usoVazio } from './limite_gasto';
import type { UsoLlm } from './limite_gasto';
import type { EntradaRedacao } from './prompt';
import type { ContextoLlm } from './redigir';
import { MAX_TENTATIVAS, PAUSA_PADRAO_MS, redigirCampo } from './redigir';

const CHAVE = 'sk-or-v1-chave-secreta-de-teste';
const MODELOS = ['google/gemma-4-31b-it:free', 'qwen/qwen3.8-27b:free', 'nvidia/nemotron-3-super-120b-a12b:free'];
const AGORA = new Date(2026, 8, 25, 10, 0, 0);
const entrada: EntradaRedacao = { pergunta: 'Qual é o objetivo de Vendas?', resposta: 'Atender os leads do primeiro contato ao pós-venda e conduzir a venda.' };
const REDIGIDO = 'Atender os leads do primeiro contato ao pós-venda e conduzir a venda com clareza.';

const config = (mudar: Partial<ConfigLlm> = {}): ConfigLlm => ({ ...configPadrao({ tetoMensalBrl: 0, alertaPercentual: 95, limiteDiario: 50, modelos: MODELOS }, '2026-09-25T10:00:00.000Z'), ...mudar });

type Roteiro = (modelo: string, i: number) => Response | Promise<Response>;
const ok = (texto = REDIGIDO, usage = { prompt_tokens: 120, completion_tokens: 40 }) => new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: texto }, finish_reason: 'stop' }], usage }), { status: 200 });
const status = (codigo: number) => new Response(JSON.stringify({ error: { code: codigo, message: 'x' } }), { status: codigo });

/** fetch falso: registra cada chamada (modelo, cabeçalhos) e responde pelo roteiro. */
function falso(roteiro: Roteiro) {
  const chamadas: { url: string; modelo: string; auth: string | null }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    const modelo = (JSON.parse(String(init?.body)) as { model: string }).model;
    chamadas.push({ url, modelo, auth: new Headers(init?.headers).get('authorization') });
    return roteiro(modelo, chamadas.length - 1);
  }) as unknown as typeof fetch;
  return { chamadas, fetchFn };
}

const ctx = (f: ReturnType<typeof falso>, extra: Partial<ContextoLlm> = {}): ContextoLlm => ({ config: config(), uso: usoVazio(AGORA), pausas: {}, modo: 'padrao', chave: CHAVE, consentimento: true, agora: () => AGORA, fetchFn: f.fetchFn, ...extra });

describe('caminho feliz', () => {
  it('usa o modelo principal, devolve texto e conta requisição e tokens reais', async () => {
    const f = falso(() => ok());
    const r = await redigirCampo(entrada, ctx(f));
    expect(r.origem).toBe('llm');
    expect(r.texto).toBe(REDIGIDO);
    expect(r.modelo).toBe(MODELOS[0]);
    expect(f.chamadas.map((c) => c.modelo)).toEqual([MODELOS[0]]);
    expect(r.uso.requisicoes_dia).toBe(1);
    expect(r.uso.tokens_entrada).toBe(120);
    expect(r.uso.tokens_saida).toBe(40);
    expect(r.uso.gasto_estimado_brl).toBe(0); // chave padrão :free não gasta
    expect(r.tentativas).toEqual([{ modelo: MODELOS[0], resultado: 'ok' }]);
  });

  it('o cabeçalho leva a chave; o resultado nunca a contém', async () => {
    const f = falso(() => ok());
    const r = await redigirCampo(entrada, ctx(f));
    expect(f.chamadas[0]!.auth).toBe(`Bearer ${CHAVE}`);
    expect(JSON.stringify(r)).not.toContain(CHAVE);
  });
});

describe('consentimento e chave', () => {
  it('sem consentimento não há chamada nenhuma', async () => {
    const f = falso(() => ok());
    const r = await redigirCampo(entrada, ctx(f, { consentimento: false }));
    expect(f.chamadas).toHaveLength(0);
    expect(r).toMatchObject({ origem: 'fallback', motivo: 'sem_consentimento', texto: entrada.resposta });
    expect(r.uso.requisicoes_dia).toBe(0);
  });

  it('sem chave não há chamada e o motivo é claro', async () => {
    const f = falso(() => ok());
    const r = await redigirCampo(entrada, ctx(f, { chave: '  ' }));
    expect(f.chamadas).toHaveLength(0);
    expect(r.motivo).toBe('sem_chave');
  });
});

describe('failover entre os 3 modelos', () => {
  it('modelo 1 falha (404) → usa o 2 e põe o 1 em pausa', async () => {
    const f = falso((m) => (m === MODELOS[0] ? status(404) : ok()));
    const r = await redigirCampo(entrada, ctx(f));
    expect(r.origem).toBe('llm');
    expect(r.modelo).toBe(MODELOS[1]);
    expect(f.chamadas.map((c) => c.modelo)).toEqual([MODELOS[0], MODELOS[1]]);
    expect(r.pausas[MODELOS[0]!]).toBe(AGORA.getTime() + PAUSA_PADRAO_MS);
    expect(r.uso.requisicoes_dia).toBe(2); // toda tentativa conta na cota do dia
  });

  it('modelos 1 e 2 falham (429 e 500) → usa o 3', async () => {
    const f = falso((m) => (m === MODELOS[0] ? status(429) : m === MODELOS[1] ? status(500) : ok()));
    const r = await redigirCampo(entrada, ctx(f));
    expect(r.modelo).toBe(MODELOS[2]);
    expect(r.tentativas.map((t) => t.resultado)).toEqual(['limite', 'servidor', 'ok']);
  });

  it('os 3 falham → fallback determinístico com o texto original, no máximo 3 chamadas', async () => {
    const f = falso(() => status(503));
    const r = await redigirCampo(entrada, ctx(f));
    expect(f.chamadas).toHaveLength(MAX_TENTATIVAS);
    expect(r).toMatchObject({ origem: 'fallback', motivo: 'todos_falharam', texto: entrada.resposta });
    expect(Object.keys(r.pausas)).toHaveLength(3);
  });

  it('modelo em pausa não é tentado (e não gasta cota); depois da pausa volta', async () => {
    const f = falso(() => ok());
    const pausas = { [MODELOS[0]!]: AGORA.getTime() + 60_000 };
    const r = await redigirCampo(entrada, ctx(f, { pausas }));
    expect(f.chamadas.map((c) => c.modelo)).toEqual([MODELOS[1]]);
    expect(r.uso.requisicoes_dia).toBe(1);
    const f2 = falso(() => ok());
    await redigirCampo(entrada, ctx(f2, { pausas: { [MODELOS[0]!]: AGORA.getTime() - 1 } }));
    expect(f2.chamadas.map((c) => c.modelo)).toEqual([MODELOS[0]]);
  });

  it('todos em pausa → fallback sem nenhuma chamada', async () => {
    const f = falso(() => ok());
    const pausas = Object.fromEntries(MODELOS.map((m) => [m, AGORA.getTime() + 1000]));
    const r = await redigirCampo(entrada, ctx(f, { pausas }));
    expect(f.chamadas).toHaveLength(0);
    expect(r.motivo).toBe('todos_falharam');
  });

  it('resposta vazia, erro dentro de um 200 e falha de rede passam ao próximo modelo', async () => {
    const roteiro: Roteiro = (m) => {
      if (m === MODELOS[0]) return ok('   ');
      if (m === MODELOS[1]) return new Response(JSON.stringify({ error: { code: 502, message: 'provedor caiu' } }), { status: 200 });
      return ok();
    };
    const r = await redigirCampo(entrada, ctx(falso(roteiro)));
    expect(r.tentativas.map((t) => t.resultado)).toEqual(['vazio', 'servidor', 'ok']);
    const rede = falso((m) => {
      if (m === MODELOS[0]) throw new TypeError('Failed to fetch');
      return ok();
    });
    expect((await redigirCampo(entrada, ctx(rede))).tentativas[0]!.resultado).toBe('rede');
  });

  it('timeout: a chamada é cancelada e o próximo modelo responde', async () => {
    const f = falso((m) => (m === MODELOS[0] ? (new Promise(() => undefined) as Promise<Response>) : ok()));
    // fetch falso que respeita o AbortSignal
    const fetchFn = (async (url: string, init?: RequestInit) => {
      const modelo = (JSON.parse(String(init?.body)) as { model: string }).model;
      if (modelo !== MODELOS[0]) return f.fetchFn(url, init);
      return new Promise<Response>((_, rejeitar) => init?.signal?.addEventListener('abort', () => rejeitar(new DOMException('abortado', 'AbortError'))));
    }) as unknown as typeof fetch;
    const r = await redigirCampo(entrada, ctx(f, { fetchFn, timeoutMs: 20 }));
    expect(r.tentativas.map((t) => t.resultado)).toEqual(['tempo', 'ok']);
  });

  it('saída com número inventado é recusada e o próximo modelo tenta; se todos inventam, cai no fallback', async () => {
    const r = await redigirCampo(entrada, ctx(falso((m) => (m === MODELOS[0] ? ok('Atender os leads em 48 minutos.') : ok()))));
    expect(r.tentativas.map((t) => t.resultado)).toEqual(['saida_invalida', 'ok']);
    expect(r.pausas).toEqual({}); // modelo que inventou não é pausado: o problema é do texto, não do provedor
    const todos = await redigirCampo(entrada, ctx(falso(() => ok('Custa R$ 50 por lead.'))));
    expect(todos).toMatchObject({ origem: 'fallback', texto: entrada.resposta });
  });
});

describe('402, 401 e o que nunca se repete', () => {
  it('402 (sem crédito): sem retry, sem tentar outro modelo, sem pausa', async () => {
    const f = falso(() => status(402));
    const r = await redigirCampo(entrada, ctx(f));
    expect(f.chamadas).toHaveLength(1);
    expect(r).toMatchObject({ origem: 'fallback', motivo: 'sem_credito', texto: entrada.resposta });
    expect(r.pausas).toEqual({});
  });

  it('401 (chave recusada) encerra na primeira chamada', async () => {
    const f = falso(() => status(401));
    const r = await redigirCampo(entrada, ctx(f));
    expect(f.chamadas).toHaveLength(1);
    expect(r.motivo).toBe('chave_invalida');
  });

  it('todo motivo de fallback tem uma mensagem para a pessoa, sem chave nem detalhe técnico', () => {
    for (const msg of Object.values(MENSAGEM_FALLBACK)) {
      expect(msg.length).toBeGreaterThan(10);
      expect(msg).not.toMatch(/sk-|Bearer|api/i);
    }
  });
});

describe('teto e limite diário bloqueiam ANTES da chamada', () => {
  it('limite diário atingido: nenhuma chamada e motivo limite_diario', async () => {
    const uso: UsoLlm = { ...usoVazio(AGORA), requisicoes_dia: 50 };
    const f = falso(() => ok());
    const r = await redigirCampo(entrada, ctx(f, { uso }));
    expect(f.chamadas).toHaveLength(0);
    expect(r.motivo).toBe('limite_diario');
  });

  it('o limite acaba no meio do failover: para na hora, sem passar do limite', async () => {
    const uso: UsoLlm = { ...usoVazio(AGORA), requisicoes_dia: 49 };
    const f = falso(() => status(500));
    const r = await redigirCampo(entrada, ctx(f, { uso }));
    expect(f.chamadas).toHaveLength(1);
    expect(r.uso.requisicoes_dia).toBe(50);
    expect(r.motivo).toBe('limite_diario');
  });
});

describe('LLM particular', () => {
  const particular = (f: ReturnType<typeof falso>, extra: Partial<ContextoLlm> = {}) =>
    ctx(f, { modo: 'particular', modeloParticular: 'openai/gpt-4o-mini', urlParticular: 'https://api.exemplo.com.br/v1/chat/completions', config: config({ teto_mensal_brl: 5, preco_entrada_brl_por_milhao: 1000, preco_saida_brl_por_milhao: 4000 }), ...extra });

  it('usa só o modelo e a URL do contratante e estima o gasto com tokens reais × preço informado', async () => {
    const f = falso(() => ok(REDIGIDO, { prompt_tokens: 1000, completion_tokens: 500 }));
    const r = await redigirCampo(entrada, particular(f));
    expect(f.chamadas).toEqual([{ url: 'https://api.exemplo.com.br/v1/chat/completions', modelo: 'openai/gpt-4o-mini', auth: `Bearer ${CHAVE}` }]);
    expect(r.uso.gasto_estimado_brl).toBeCloseTo((1000 * 1000 + 500 * 4000) / 1_000_000, 10); // R$ 3,00
  });

  it('teto R$ 0 = nenhuma chamada paga: bloqueia antes de sair', async () => {
    const f = falso(() => ok());
    const r = await redigirCampo(entrada, particular(f, { config: config({ teto_mensal_brl: 0 }) }));
    expect(f.chamadas).toHaveLength(0);
    expect(r.motivo).toBe('teto');
  });

  it('gasto já no teto bloqueia; a mesma chave padrão :free continua liberada pelo limite diário', async () => {
    const uso: UsoLlm = { ...usoVazio(AGORA), gasto_estimado_brl: 5 };
    const f = falso(() => ok());
    expect((await redigirCampo(entrada, particular(f, { uso }))).motivo).toBe('teto');
    expect((await redigirCampo(entrada, ctx(f, { uso, config: config({ teto_mensal_brl: 0 }) }))).origem).toBe('llm');
  });

  it('URL sem https nunca recebe a chave; sem modelo não chama', async () => {
    const f = falso(() => ok());
    const r = await redigirCampo(entrada, particular(f, { urlParticular: 'http://api.exemplo.com.br/v1' }));
    expect(f.chamadas).toHaveLength(0);
    expect(r.tentativas[0]!.resultado).toBe('http');
    expect((await redigirCampo(entrada, particular(f, { modeloParticular: '' }))).motivo).toBe('sem_modelo');
  });
});

describe('cliente', () => {
  it('erros de status viram categorias; 200 sem conteúdo em texto é “vazio”', async () => {
    const cat = async (r: Response) => {
      const res = await chamarModelo({ chave: CHAVE, modelo: MODELOS[0]!, mensagens: [], fetchFn: (async () => r) as unknown as typeof fetch });
      return res.ok ? 'ok' : res.erro;
    };
    expect(await cat(status(401))).toBe('chave_invalida');
    expect(await cat(status(402))).toBe('sem_credito');
    expect(await cat(status(404))).toBe('modelo_indisponivel');
    expect(await cat(status(429))).toBe('limite');
    expect(await cat(status(500))).toBe('servidor');
    expect(await cat(status(418))).toBe('http');
    expect(await cat(new Response(JSON.stringify({ choices: [{ message: { content: { a: 1 } } }] }), { status: 200 }))).toBe('vazio');
    expect(await cat(new Response('não é json', { status: 200 }))).toBe('vazio');
  });
});
