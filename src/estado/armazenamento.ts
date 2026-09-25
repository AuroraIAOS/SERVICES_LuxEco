// Estado do FPE guardado no navegador (localStorage). Nada aqui depende do React.
// Regras: (1) storage pode não existir ou lançar (janela privada, dados bloqueados, prévia) — a tela funciona mesmo assim;
// (2) o que está guardado é validado antes de usar (JSON corrompido não derruba a tela nem apaga a evidência);
// (3) editar um campo para o valor original NÃO conta como edição; (4) toda edição real marca origem "manual".
import { z } from 'zod';

export const CAMPOS_FICHA = ['what', 'why', 'where', 'when', 'who', 'how'] as const;
export type CampoFicha = (typeof CAMPOS_FICHA)[number];

export const CHAVE_FPE = 'lux_fpe_estado_v1';
/** cópia do texto ilegível, guardada antes de qualquer regravação (nunca apagar em silêncio). */
export const CHAVE_FPE_INVALIDO = `${CHAVE_FPE}_invalido`;
/** cópia do estado que uma importação de JSON substituiu (nunca apagar em silêncio). */
export const CHAVE_FPE_ANTES_IMPORTAR = `${CHAVE_FPE}_antes_importar`;
export const SCHEMA_VERSAO = 1;

const texto = z.string().optional();
const esquemaCampos = z.object({ what: texto, why: texto, where: texto, when: texto, who: texto, how: texto });
const esquemaEdicao = z.object({ campos: esquemaCampos, origem: z.literal('manual'), atualizado_em: z.string() });
/** também valida o `estado` dentro do JSON exportado (src/exportar/json.ts): um só formato, um só validador. */
export const esquemaEstado = z.object({ schema_versao: z.literal(SCHEMA_VERSAO), fpe_edicoes: z.record(z.string(), esquemaEdicao) });

export interface EdicaoFicha {
  /** só os campos que diferem do padrão. */
  campos: Partial<Record<CampoFicha, string>>;
  origem: 'manual';
  atualizado_em: string;
}

/** Forma do `estado_backup.fpe_edicoes` (docs/02): o backup HTML (03.5) embute este mesmo objeto. */
export interface EstadoFpe {
  schema_versao: typeof SCHEMA_VERSAO;
  fpe_edicoes: Record<string, EdicaoFicha>;
}

export const estadoFpeVazio = (): EstadoFpe => ({ schema_versao: SCHEMA_VERSAO, fpe_edicoes: {} });

/** O mínimo do Storage que usamos (facilita trocar por um falso nos testes). */
export interface ArmazenamentoTexto {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

/** localStorage ou `null` quando o navegador o bloqueia (acessá-lo pode lançar). */
export function armazenamentoDoNavegador(): ArmazenamentoTexto | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export type OrigemDaLeitura = 'armazenamento' | 'vazio' | 'corrompido' | 'indisponivel';

export interface ResultadoLeitura {
  estado: EstadoFpe;
  origem: OrigemDaLeitura;
}

export function lerEstadoFpe(storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): ResultadoLeitura {
  if (!storage) return { estado: estadoFpeVazio(), origem: 'indisponivel' };
  let bruto: string | null;
  try {
    bruto = storage.getItem(CHAVE_FPE);
  } catch {
    return { estado: estadoFpeVazio(), origem: 'indisponivel' };
  }
  if (bruto === null) return { estado: estadoFpeVazio(), origem: 'vazio' };
  try {
    const lido = esquemaEstado.safeParse(JSON.parse(bruto));
    if (lido.success) return { estado: lido.data as EstadoFpe, origem: 'armazenamento' };
  } catch {
    // cai no tratamento de corrompido abaixo
  }
  try {
    storage.setItem(CHAVE_FPE_INVALIDO, bruto);
  } catch {
    // sem espaço para a cópia: segue com o estado vazio mesmo assim
  }
  return { estado: estadoFpeVazio(), origem: 'corrompido' };
}

/** `true` se gravou; `false` se o navegador recusou (cota cheia, modo privado). O estado em memória continua valendo. */
export function gravarEstadoFpe(estado: EstadoFpe, storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(CHAVE_FPE, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}

/** Guarda o estado atual antes de uma importação o substituir. `false` se o navegador recusou (a tela avisa). */
export function guardarCopiaAntesDeImportar(estado: EstadoFpe, storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(CHAVE_FPE_ANTES_IMPORTAR, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}

/** Valores padrão de uma ficha, para comparar com o que foi digitado. */
export type ValoresFicha = Record<CampoFicha, string>;

/**
 * Registra a edição de um campo (imutável). Valor igual ao padrão desfaz a edição do campo;
 * sem nenhum campo diferente, a ficha deixa de constar como editada.
 */
export function editarCampo(estado: EstadoFpe, fichaId: string, padrao: ValoresFicha, campo: CampoFicha, valor: string, agora: string): EstadoFpe {
  const atual = estado.fpe_edicoes[fichaId];
  const campos = { ...atual?.campos };
  if (valor === padrao[campo]) delete campos[campo];
  else campos[campo] = valor;
  const { [fichaId]: _removida, ...resto } = estado.fpe_edicoes;
  if (Object.keys(campos).length === 0) return { ...estado, fpe_edicoes: resto };
  return { ...estado, fpe_edicoes: { ...resto, [fichaId]: { campos, origem: 'manual', atualizado_em: agora } } };
}

/** Volta a ficha ao padrão (remove todas as edições dela). */
export function restaurarFicha(estado: EstadoFpe, fichaId: string): EstadoFpe {
  if (!(fichaId in estado.fpe_edicoes)) return estado;
  const { [fichaId]: _removida, ...resto } = estado.fpe_edicoes;
  return { ...estado, fpe_edicoes: resto };
}

/** Valores em vigor: o padrão da ficha com as edições por cima. */
export function valoresEfetivos(padrao: ValoresFicha, edicao?: EdicaoFicha): ValoresFicha {
  return { ...padrao, ...edicao?.campos } as ValoresFicha;
}
