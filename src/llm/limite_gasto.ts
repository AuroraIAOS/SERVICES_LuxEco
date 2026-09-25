// Circuit breaker do LLM (03.3): o limite é REGRA DE CÓDIGO, aplicada antes de cada chamada — nenhuma LLM decide.
// Rastreador de uso IMUTÁVEL (cada função devolve um novo estado). Teto atingido ⇒ bloqueia e o app usa o fallback determinístico.
// Chave padrão `:free`: só o limite diário vale (gasto zero). Chave particular: o gasto estimado (tokens reais × preço informado
// pelo contratante) não pode chegar ao teto; teto R$ 0 = nenhuma chamada paga. O app não inventa preço.
import type { ConfigLlm } from './config';
import { TETO_SANIDADE_BRL } from './config';

export type ModoLlm = 'padrao' | 'particular';

export interface UsoLlm {
  /** AAAA-MM do contador de gasto. */
  mes: string;
  /** AAAA-MM-DD do contador de requisições. */
  dia: string;
  tokens_entrada: number;
  tokens_saida: number;
  gasto_estimado_brl: number;
  requisicoes_dia: number;
}

const p2 = (n: number) => String(n).padStart(2, '0');
export const diaLocal = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const mesLocal = (d: Date) => diaLocal(d).slice(0, 7);

export const usoVazio = (agora: Date): UsoLlm => ({ mes: mesLocal(agora), dia: diaLocal(agora), tokens_entrada: 0, tokens_saida: 0, gasto_estimado_brl: 0, requisicoes_dia: 0 });

/** Vira o dia/mês: o contador do dia zera na virada do dia; gasto e tokens zeram na virada do mês. */
export function usoDeHoje(uso: UsoLlm, agora: Date): UsoLlm {
  const mudouMes = uso.mes !== mesLocal(agora);
  const mudouDia = uso.dia !== diaLocal(agora);
  if (!mudouMes && !mudouDia) return uso;
  return {
    mes: mesLocal(agora),
    dia: diaLocal(agora),
    tokens_entrada: mudouMes ? 0 : uso.tokens_entrada,
    tokens_saida: mudouMes ? 0 : uso.tokens_saida,
    gasto_estimado_brl: mudouMes ? 0 : uso.gasto_estimado_brl,
    requisicoes_dia: mudouDia ? 0 : uso.requisicoes_dia,
  };
}

export type Decisao = { permitido: true } | { permitido: false; motivo: 'teto' | 'limite_diario' };

/** Chamada só sai se passar aqui. Sempre com o uso já virado para hoje. */
export function decidirChamada(config: ConfigLlm, usoBruto: UsoLlm, modo: ModoLlm, agora: Date): Decisao {
  const uso = usoDeHoje(usoBruto, agora);
  if (uso.requisicoes_dia >= config.limite_diario_requisicoes) return { permitido: false, motivo: 'limite_diario' };
  if (modo === 'particular' && uso.gasto_estimado_brl >= config.teto_mensal_brl) return { permitido: false, motivo: 'teto' };
  return { permitido: true };
}

/** Uma requisição saiu (conta na cota do dia mesmo se falhou: o provedor a contou). */
export function registrarRequisicao(usoBruto: UsoLlm, agora: Date): UsoLlm {
  const uso = usoDeHoje(usoBruto, agora);
  return { ...uso, requisicoes_dia: uso.requisicoes_dia + 1 };
}

/** Tokens REAIS devolvidos pela API × preço por 1 milhão informado pelo contratante (só chave particular). */
export function registrarTokens(usoBruto: UsoLlm, config: ConfigLlm, modo: ModoLlm, tokensEntrada: number, tokensSaida: number, agora: Date): UsoLlm {
  const uso = usoDeHoje(usoBruto, agora);
  const custo = modo === 'particular' ? ((tokensEntrada * (config.preco_entrada_brl_por_milhao ?? 0)) + (tokensSaida * (config.preco_saida_brl_por_milhao ?? 0))) / 1_000_000 : 0;
  return {
    ...uso,
    tokens_entrada: uso.tokens_entrada + tokensEntrada,
    tokens_saida: uso.tokens_saida + tokensSaida,
    gasto_estimado_brl: uso.gasto_estimado_brl + custo,
  };
}

/** “Zerar contador do mês”: gasto e tokens voltam a zero; o contador do dia fica (é o do provedor). */
export const zerarMes = (uso: UsoLlm): UsoLlm => ({ ...uso, tokens_entrada: 0, tokens_saida: 0, gasto_estimado_brl: 0 });

/** Uso do teto em % (0 quando o teto é R$ 0: não há barra a encher). */
export const percentualDoTeto = (config: ConfigLlm, uso: UsoLlm) => (config.teto_mensal_brl > 0 ? Math.min(100, (uso.gasto_estimado_brl / config.teto_mensal_brl) * 100) : 0);

export type NivelAlerta = 'ok' | 'alerta' | 'bloqueado';

/** Estado para o aviso da tela: perto do teto (alerta), teto atingido, ou perto/no limite diário. */
export function nivelDeAlerta(config: ConfigLlm, usoBruto: UsoLlm, modo: ModoLlm, agora: Date): { teto: NivelAlerta; diario: NivelAlerta } {
  const uso = usoDeHoje(usoBruto, agora);
  const limiar = config.alerta_percentual / 100;
  const diario: NivelAlerta = uso.requisicoes_dia >= config.limite_diario_requisicoes ? 'bloqueado' : uso.requisicoes_dia >= config.limite_diario_requisicoes * limiar ? 'alerta' : 'ok';
  let teto: NivelAlerta = 'ok';
  if (modo === 'particular') {
    if (uso.gasto_estimado_brl >= config.teto_mensal_brl) teto = 'bloqueado';
    else if (uso.gasto_estimado_brl >= config.teto_mensal_brl * limiar) teto = 'alerta';
  }
  return { teto, diario };
}

// ---------------------------------------------------------------------------------------------
// Edição da configuração no painel: faixa validada aqui (o PHP repete a validação, 03.5) e trava de ciência de custo.
// ---------------------------------------------------------------------------------------------

export interface PedidoDeConfig {
  teto_mensal_brl: string;
  /** só obrigatório para AUMENTAR o teto acima de R$ 0 ou acima do atual. */
  teto_confirmacao: string;
  ciencia_de_custo: boolean;
  alerta_percentual: string;
  limite_diario_requisicoes: string;
  preco_entrada_brl_por_milhao: string;
  preco_saida_brl_por_milhao: string;
}

export type CampoConfig = keyof PedidoDeConfig;
export type ErrosDeConfig = Partial<Record<CampoConfig, string>>;

/** “12,5” ou “12.5” → 12.5; vazio ou lixo → NaN. Aceita só dígitos, vírgula/ponto e sinal. */
export function numeroDoCampo(texto: string): number {
  const t = texto.trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

/**
 * Valida o que a pessoa digitou no painel e devolve a nova config OU os erros por campo (nunca as duas coisas).
 * - valores negativos, não numéricos ou acima do teto de sanidade (R$ 10.000) são recusados;
 * - reduzir o teto é livre; aumentá-lo exige o checkbox de ciência e o valor digitado duas vezes.
 */
export function aplicarPedidoDeConfig(atual: ConfigLlm, pedido: PedidoDeConfig, agora: string): { ok: true; config: ConfigLlm } | { ok: false; erros: ErrosDeConfig } {
  const erros: ErrosDeConfig = {};
  const teto = numeroDoCampo(pedido.teto_mensal_brl);
  if (Number.isNaN(teto)) erros.teto_mensal_brl = 'Digite o teto em reais, só números (ex.: 0 ou 50).';
  else if (teto < 0) erros.teto_mensal_brl = 'O teto não pode ser negativo.';
  else if (teto > TETO_SANIDADE_BRL) erros.teto_mensal_brl = `O teto máximo aceito é R$ ${TETO_SANIDADE_BRL.toLocaleString('pt-BR')}.`;

  if (!erros.teto_mensal_brl && teto > atual.teto_mensal_brl) {
    if (!pedido.ciencia_de_custo) erros.ciencia_de_custo = 'Marque que você entende que o gasto é cobrado na sua conta do provedor.';
    if (numeroDoCampo(pedido.teto_confirmacao) !== teto) erros.teto_confirmacao = 'Digite o novo teto de novo, igual ao de cima, para confirmar.';
  }

  const alerta = numeroDoCampo(pedido.alerta_percentual);
  if (!Number.isInteger(alerta) || alerta < 1 || alerta > 100) erros.alerta_percentual = 'Informe o alerta em % (de 1 a 100).';
  const diario = numeroDoCampo(pedido.limite_diario_requisicoes);
  if (!Number.isInteger(diario) || diario < 0) erros.limite_diario_requisicoes = 'Informe o limite diário como número inteiro, 0 ou mais.';
  else if (diario > 100_000) erros.limite_diario_requisicoes = 'O limite diário máximo aceito é 100.000.';

  const preco = (campo: 'preco_entrada_brl_por_milhao' | 'preco_saida_brl_por_milhao') => {
    if (pedido[campo].trim() === '') return undefined;
    const n = numeroDoCampo(pedido[campo]);
    if (Number.isNaN(n) || n < 0 || n > TETO_SANIDADE_BRL) erros[campo] = `Informe o preço em reais por 1 milhão de tokens (de 0 a ${TETO_SANIDADE_BRL.toLocaleString('pt-BR')}) ou deixe em branco.`;
    return n;
  };
  const entrada = preco('preco_entrada_brl_por_milhao');
  const saida = preco('preco_saida_brl_por_milhao');

  if (Object.keys(erros).length) return { ok: false, erros };
  const { preco_entrada_brl_por_milhao: _e, preco_saida_brl_por_milhao: _s, ...base } = atual;
  return {
    ok: true,
    config: {
      ...base,
      teto_mensal_brl: teto,
      alerta_percentual: alerta,
      limite_diario_requisicoes: diario,
      ...(entrada === undefined ? {} : { preco_entrada_brl_por_milhao: entrada }),
      ...(saida === undefined ? {} : { preco_saida_brl_por_milhao: saida }),
      atualizado_em: agora,
    },
  };
}
