// @vitest-environment node
// Circuit breaker (03.3): teto atingido ⇒ 0 chamadas; teto editado no painel passa a valer; aumento sem ciência é recusado;
// gasto zera com “Zerar contador”; a config nunca carrega chave de API.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ConfigLlm } from './config';
import { configPadrao, esquemaConfigLlm, lerConfig, normalizarModelos, TETO_SANIDADE_BRL } from './config';
import { lerAmbiente, modelosPadrao } from './ambiente';
import type { PedidoDeConfig } from './limite_gasto';
import { aplicarPedidoDeConfig, decidirChamada, nivelDeAlerta, numeroDoCampo, percentualDoLimiteDiario, percentualDoTeto, registrarRequisicao, registrarTokens, usoDeHoje, usoVazio, zerarMes } from './limite_gasto';

const MODELOS = ['google/gemma-4-31b-it:free', 'qwen/qwen3.8-27b:free', 'nvidia/nemotron-3-super-120b-a12b:free'];
const DIA = new Date(2026, 8, 25, 10, 0, 0);
const config = (m: Partial<ConfigLlm> = {}): ConfigLlm => ({ ...configPadrao({ tetoMensalBrl: 0, alertaPercentual: 90, limiteDiario: 50, modelos: MODELOS }, '2026-09-25T10:00:00.000Z'), ...m });
const pedidoDe = (c: ConfigLlm, m: Partial<PedidoDeConfig> = {}): PedidoDeConfig => ({
  teto_mensal_brl: String(c.teto_mensal_brl),
  teto_confirmacao: '',
  ciencia_de_custo: false,
  alerta_percentual: String(c.alerta_percentual),
  limite_diario_requisicoes: String(c.limite_diario_requisicoes),
  preco_entrada_brl_por_milhao: '',
  preco_saida_brl_por_milhao: '',
  ...m,
});

describe('decidirChamada', () => {
  it('chave padrão :free: só o limite diário vale (teto R$ 0 não bloqueia)', () => {
    expect(decidirChamada(config(), usoVazio(DIA), 'padrao', DIA)).toEqual({ permitido: true });
    expect(decidirChamada(config(), { ...usoVazio(DIA), requisicoes_dia: 50 }, 'padrao', DIA)).toEqual({ permitido: false, motivo: 'limite_diario' });
    expect(decidirChamada(config(), { ...usoVazio(DIA), requisicoes_dia: 49 }, 'padrao', DIA).permitido).toBe(true);
  });

  it('chave particular: teto R$ 0 = nenhuma chamada paga; gasto ≥ teto bloqueia; abaixo passa', () => {
    expect(decidirChamada(config(), usoVazio(DIA), 'particular', DIA)).toEqual({ permitido: false, motivo: 'teto' });
    const c = config({ teto_mensal_brl: 10 });
    expect(decidirChamada(c, { ...usoVazio(DIA), gasto_estimado_brl: 9.99 }, 'particular', DIA).permitido).toBe(true);
    expect(decidirChamada(c, { ...usoVazio(DIA), gasto_estimado_brl: 10 }, 'particular', DIA)).toEqual({ permitido: false, motivo: 'teto' });
  });

  it('limite diário 0 bloqueia tudo', () => {
    expect(decidirChamada(config({ limite_diario_requisicoes: 0 }), usoVazio(DIA), 'padrao', DIA).permitido).toBe(false);
  });
});

describe('rastreador imutável', () => {
  it('cada função devolve um novo estado e não altera o anterior', () => {
    const a = usoVazio(DIA);
    const b = registrarRequisicao(a, DIA);
    const c = registrarTokens(b, config({ preco_entrada_brl_por_milhao: 100, preco_saida_brl_por_milhao: 200 }), 'particular', 1000, 1000, DIA);
    expect(a.requisicoes_dia).toBe(0);
    expect(b.requisicoes_dia).toBe(1);
    expect(b.gasto_estimado_brl).toBe(0);
    expect(c.gasto_estimado_brl).toBeCloseTo(0.3, 10);
    expect(Object.isFrozen(a)).toBe(false); // sem mutação por convenção: os testes acima provam o efeito
  });

  it('sem preço informado o gasto não é inventado (fica em zero)', () => {
    expect(registrarTokens(usoVazio(DIA), config(), 'particular', 5000, 5000, DIA).gasto_estimado_brl).toBe(0);
  });

  it('virada do dia zera só as requisições; virada do mês zera também gasto e tokens', () => {
    const u = { mes: '2026-09', dia: '2026-09-24', tokens_entrada: 10, tokens_saida: 20, gasto_estimado_brl: 3, requisicoes_dia: 40 };
    expect(usoDeHoje(u, DIA)).toEqual({ ...u, dia: '2026-09-25', requisicoes_dia: 0 });
    expect(usoDeHoje(u, new Date(2026, 9, 1))).toEqual({ mes: '2026-10', dia: '2026-10-01', tokens_entrada: 0, tokens_saida: 0, gasto_estimado_brl: 0, requisicoes_dia: 0 });
    expect(usoDeHoje(u, new Date(2026, 8, 24))).toBe(u);
  });

  it('“Zerar contador do mês” zera gasto e tokens e mantém o contador do dia', () => {
    const u = { ...usoVazio(DIA), tokens_entrada: 10, tokens_saida: 20, gasto_estimado_brl: 3, requisicoes_dia: 7 };
    expect(zerarMes(u)).toEqual({ ...u, tokens_entrada: 0, tokens_saida: 0, gasto_estimado_brl: 0 });
    const c = config({ teto_mensal_brl: 3 });
    expect(decidirChamada(c, u, 'particular', DIA).permitido).toBe(false);
    expect(decidirChamada(c, zerarMes(u), 'particular', DIA).permitido).toBe(true);
  });
});

describe('alertas e barra de uso', () => {
  it('avisa no percentual configurado e bloqueia no teto', () => {
    const c = config({ teto_mensal_brl: 10, alerta_percentual: 90 });
    expect(nivelDeAlerta(c, { ...usoVazio(DIA), gasto_estimado_brl: 8.9 }, 'particular', DIA).teto).toBe('ok');
    expect(nivelDeAlerta(c, { ...usoVazio(DIA), gasto_estimado_brl: 9 }, 'particular', DIA).teto).toBe('alerta');
    expect(nivelDeAlerta(c, { ...usoVazio(DIA), gasto_estimado_brl: 10 }, 'particular', DIA).teto).toBe('bloqueado');
    expect(nivelDeAlerta(c, { ...usoVazio(DIA), requisicoes_dia: 45 }, 'padrao', DIA).diario).toBe('alerta');
    expect(nivelDeAlerta(c, { ...usoVazio(DIA), requisicoes_dia: 50 }, 'padrao', DIA).diario).toBe('bloqueado');
    expect(nivelDeAlerta(c, { ...usoVazio(DIA), gasto_estimado_brl: 99 }, 'padrao', DIA).teto).toBe('ok'); // :free não usa o teto
  });

  it('percentual do teto (0 quando o teto é R$ 0; nunca passa de 100)', () => {
    expect(percentualDoTeto(config(), usoVazio(DIA))).toBe(0);
    expect(percentualDoTeto(config({ teto_mensal_brl: 10 }), { ...usoVazio(DIA), gasto_estimado_brl: 2.5 })).toBe(25);
    expect(percentualDoTeto(config({ teto_mensal_brl: 10 }), { ...usoVazio(DIA), gasto_estimado_brl: 30 })).toBe(100);
  });

  it('percentual do limite diário de chamadas (0 quando o limite é 0; 4 de 50 = 8%; nunca passa de 100)', () => {
    expect(percentualDoLimiteDiario(config({ limite_diario_requisicoes: 0 }), { ...usoVazio(DIA), requisicoes_dia: 3 })).toBe(0);
    expect(percentualDoLimiteDiario(config({ limite_diario_requisicoes: 50 }), usoVazio(DIA))).toBe(0);
    expect(percentualDoLimiteDiario(config({ limite_diario_requisicoes: 50 }), { ...usoVazio(DIA), requisicoes_dia: 4 })).toBe(8);
    expect(percentualDoLimiteDiario(config({ limite_diario_requisicoes: 50 }), { ...usoVazio(DIA), requisicoes_dia: 80 })).toBe(100);
  });
});

describe('painel: edição do teto', () => {
  const atual = config();

  it('o teto editado passa a valer (ida e volta pelo pedido → config → decisão)', () => {
    const r = aplicarPedidoDeConfig(atual, pedidoDe(atual, { teto_mensal_brl: '20', teto_confirmacao: '20', ciencia_de_custo: true, preco_entrada_brl_por_milhao: '10,5' }), '2026-09-25T11:00:00.000Z');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.teto_mensal_brl).toBe(20);
    expect(r.config.preco_entrada_brl_por_milhao).toBe(10.5);
    expect(r.config.atualizado_em).toBe('2026-09-25T11:00:00.000Z');
    expect(lerConfig(r.config)).toEqual(r.config); // continua válida no esquema
    expect(decidirChamada(atual, usoVazio(DIA), 'particular', DIA).permitido).toBe(false);
    expect(decidirChamada(r.config, usoVazio(DIA), 'particular', DIA).permitido).toBe(true);
  });

  it('aumento sem ciência de custo é recusado', () => {
    const r = aplicarPedidoDeConfig(atual, pedidoDe(atual, { teto_mensal_brl: '20', teto_confirmacao: '20' }), 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.ciencia_de_custo).toMatch(/gasto é cobrado na sua conta/);
  });

  it('aumento sem digitar o valor duas vezes (ou digitando diferente) é recusado', () => {
    for (const confirmacao of ['', '21', 'vinte']) {
      const r = aplicarPedidoDeConfig(atual, pedidoDe(atual, { teto_mensal_brl: '20', teto_confirmacao: confirmacao, ciencia_de_custo: true }), 'x');
      expect(r.ok, confirmacao).toBe(false);
      if (!r.ok) expect(r.erros.teto_confirmacao).toMatch(/de novo/);
    }
  });

  it('reduzir o teto é livre (sem ciência nem confirmação)', () => {
    const alto = config({ teto_mensal_brl: 50 });
    const r = aplicarPedidoDeConfig(alto, pedidoDe(alto, { teto_mensal_brl: '10' }), 'x');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.teto_mensal_brl).toBe(10);
  });

  it.each([['-1', /negativo/], ['abc', /só números/], ['', /só números/], ['10001', /máximo aceito/], ['1e3', /só números/]])('teto %j é recusado', (valor, msg) => {
    const r = aplicarPedidoDeConfig(atual, pedidoDe(atual, { teto_mensal_brl: valor, teto_confirmacao: valor, ciencia_de_custo: true }), 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.teto_mensal_brl).toMatch(msg);
  });

  it('o teto de sanidade (R$ 10.000) é aceito com ciência; um centavo acima, não', () => {
    expect(aplicarPedidoDeConfig(atual, pedidoDe(atual, { teto_mensal_brl: String(TETO_SANIDADE_BRL), teto_confirmacao: String(TETO_SANIDADE_BRL), ciencia_de_custo: true }), 'x').ok).toBe(true);
    expect(aplicarPedidoDeConfig(atual, pedidoDe(atual, { teto_mensal_brl: '10000,01', teto_confirmacao: '10000,01', ciencia_de_custo: true }), 'x').ok).toBe(false);
  });

  it('alerta, limite diário e preços têm faixa', () => {
    const r = aplicarPedidoDeConfig(atual, pedidoDe(atual, { alerta_percentual: '0', limite_diario_requisicoes: '-2', preco_entrada_brl_por_milhao: 'caro', preco_saida_brl_por_milhao: '-1' }), 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(['alerta_percentual', 'limite_diario_requisicoes', 'preco_entrada_brl_por_milhao', 'preco_saida_brl_por_milhao']);
    expect(aplicarPedidoDeConfig(atual, pedidoDe(atual, { alerta_percentual: '101' }), 'x').ok).toBe(false);
    expect(aplicarPedidoDeConfig(atual, pedidoDe(atual, { limite_diario_requisicoes: '100001' }), 'x').ok).toBe(false);
    expect(aplicarPedidoDeConfig(atual, pedidoDe(atual, { limite_diario_requisicoes: '0' }), 'x').ok).toBe(true);
  });

  it('numeroDoCampo aceita vírgula e recusa notação estranha', () => {
    expect(numeroDoCampo('12,5')).toBe(12.5);
    expect(numeroDoCampo(' 7 ')).toBe(7);
    for (const ruim of ['', 'a', '1e3', '0x10', '1,2,3', '--1']) expect(numeroDoCampo(ruim), ruim).toBeNaN();
  });
});

describe('config sem chave de API', () => {
  it('o esquema é estrito: campo extra (ex.: api_key) é recusado', () => {
    expect(lerConfig(config())).not.toBeNull();
    expect(lerConfig({ ...config(), api_key: 'sk-or-v1-x' })).toBeNull();
    expect(lerConfig({ ...config(), chave: 'sk-or-v1-x' })).toBeNull();
    expect(esquemaConfigLlm.safeParse({ ...config(), apiKey: 'x' }).success).toBe(false);
  });

  it('a lista de modelos: 1 a 3 ids :free; id pago, repetido ou inválido é recusado', () => {
    expect(lerConfig(config({ modelos: [] }))).toBeNull();
    expect(lerConfig(config({ modelos: [...MODELOS, 'a/b:free'] }))).toBeNull();
    expect(lerConfig(config({ modelos: ['openai/gpt-4o-mini'] }))).toBeNull();
    expect(lerConfig(config({ modelos: ['sem-barra:free'] }))).toBeNull();
    expect(normalizarModelos([' google/gemma-4-31b-it:free ', 'google/gemma-4-31b-it:free', 'openai/gpt-4o', 'x/y:free', 'a/b:free', 'c/d:free'])).toEqual(['google/gemma-4-31b-it:free', 'x/y:free', 'a/b:free']);
  });

  it('o código do circuit breaker e da config não menciona chave de API', () => {
    for (const arquivo of ['limite_gasto.ts', 'config.ts']) {
      const fonte = readFileSync(resolve(import.meta.dirname, arquivo), 'utf8');
      expect(fonte.match(/apiKey|api_key/g) ?? [], arquivo).toEqual([]);
    }
  });
});

describe('padrões do .env (nada de teto fixo em código)', () => {
  it('teto, alerta e limite diário vêm do ambiente; ausente ou inválido cai no padrão seguro (R$ 0)', () => {
    const a = lerAmbiente({ VITE_LLM_LIMITE_DIARIO_FREE: '30' }, '12,5', '80');
    expect(a.padroes).toMatchObject({ tetoMensalBrl: 12.5, alertaPercentual: 80, limiteDiario: 30 });
    const b = lerAmbiente({}, undefined, undefined);
    expect(b.padroes).toMatchObject({ tetoMensalBrl: 0, alertaPercentual: 95, limiteDiario: 50 });
    const c = lerAmbiente({ VITE_LLM_LIMITE_DIARIO_FREE: 'muitas' }, '-5', '500');
    expect(c.padroes).toMatchObject({ tetoMensalBrl: 0, alertaPercentual: 95, limiteDiario: 50 });
  });

  it('placeholder da chave vale como ausente; modo single desativa a IA', () => {
    expect(lerAmbiente({ VITE_OPENROUTER_API_KEY: 'sk-or-v1-...' }).chave).toBe('');
    expect(lerAmbiente({ VITE_OPENROUTER_API_KEY: ' sk-or-v1-real ' }).chave).toBe('sk-or-v1-real');
    expect(lerAmbiente({ MODE: 'single' }).llmDisponivel).toBe(false);
    expect(lerAmbiente({ MODE: 'production' }).llmDisponivel).toBe(true);
  });

  it('VITE_OPENROUTER_MODELO_PADRAO válido vira o principal; placeholder ou id pago é ignorado; sempre ≤ 3', () => {
    expect(modelosPadrao({})).toEqual(MODELOS);
    expect(modelosPadrao({ VITE_OPENROUTER_MODELO_PADRAO: '[provedor/modelo]:free' })).toEqual(MODELOS);
    expect(modelosPadrao({ VITE_OPENROUTER_MODELO_PADRAO: 'openai/gpt-4o' })).toEqual(MODELOS);
    const m = modelosPadrao({ VITE_OPENROUTER_MODELO_PADRAO: 'x/novo:free' });
    expect(m).toHaveLength(3);
    expect(m[0]).toBe('x/novo:free');
    expect(modelosPadrao({ VITE_OPENROUTER_MODELO_PADRAO: MODELOS[1] })[0]).toBe(MODELOS[1]);
  });
});
