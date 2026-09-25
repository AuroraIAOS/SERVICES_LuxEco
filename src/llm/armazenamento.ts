// Persistência local do LLM (03.3): config, contador de uso e consentimento. Regras do FPE: storage pode faltar ou lançar;
// o que está guardado é validado; o ilegível é copiado antes de ser regravado. A CHAVE DE API NUNCA é gravada aqui
// (a config tem esquema `strict`; a chave particular vive só na memória da sessão).
// O servidor (rotas config_ler/config_gravar da API de backups, 03.5) guarda a MESMA config; sem servidor, vale só o local.
import { z } from 'zod';
import type { ArmazenamentoTexto } from '../estado/armazenamento';
import { armazenamentoDoNavegador } from '../estado/armazenamento';
import type { ConfigLlm } from './config';
import { lerConfig } from './config';
import type { UsoLlm } from './limite_gasto';

export const CHAVE_LLM_CONFIG = 'lux_llm_config_v1';
export const CHAVE_LLM_USO = 'lux_llm_uso_v1';
export const CHAVE_LLM_CONSENTIMENTO = 'lux_llm_consentimento_v1';

const esquemaUso = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/),
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tokens_entrada: z.number().int().min(0),
  tokens_saida: z.number().int().min(0),
  gasto_estimado_brl: z.number().min(0),
  requisicoes_dia: z.number().int().min(0),
});
const esquemaConsentimento = z.object({ aceito: z.literal(true), em: z.string() });

function ler(chave: string, storage: ArmazenamentoTexto | null): unknown {
  if (!storage) return undefined;
  try {
    const bruto = storage.getItem(chave);
    if (bruto === null) return undefined;
    try {
      return JSON.parse(bruto);
    } catch {
      try {
        storage.setItem(`${chave}_invalido`, bruto); // nunca apagar em silêncio
      } catch {
        // sem espaço para a cópia
      }
      return undefined;
    }
  } catch {
    return undefined;
  }
}

function gravar(chave: string, valor: unknown, storage: ArmazenamentoTexto | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export const lerConfigLocal = (storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): ConfigLlm | null => lerConfig(ler(CHAVE_LLM_CONFIG, storage));
export const gravarConfigLocal = (config: ConfigLlm, storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()) => gravar(CHAVE_LLM_CONFIG, config, storage);

export function lerUsoLocal(storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): UsoLlm | null {
  const r = esquemaUso.safeParse(ler(CHAVE_LLM_USO, storage));
  return r.success ? r.data : null;
}
export const gravarUsoLocal = (uso: UsoLlm, storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()) => gravar(CHAVE_LLM_USO, uso, storage);

export const lerConsentimento = (storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): boolean => esquemaConsentimento.safeParse(ler(CHAVE_LLM_CONSENTIMENTO, storage)).success;
export const gravarConsentimento = (aceito: boolean, agora: string, storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()) =>
  gravar(CHAVE_LLM_CONSENTIMENTO, aceito ? { aceito: true, em: agora } : { aceito: false }, storage);
