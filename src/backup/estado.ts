// Estado do backup (03.6): `estado_backup { schema_versao, fpe_edicoes, pop_respostas, gerado_em }` (docs/07) — o MESMO que o FPE e o POP
// guardam no navegador, validado pelos mesmos esquemas Zod. Restaurar substitui o estado local; antes, o app guarda um ponto de desfazer
// em localStorage (nada é apagado em silêncio; desfazer também pode ser desfeito). Puro: sem React, sem rede.
import { z } from 'zod';
import type { EstadoFpe } from '../estado/armazenamento';
import { armazenamentoDoNavegador, CHAVE_FPE, esquemaEstado, gravarEstadoFpe, lerEstadoFpe } from '../estado/armazenamento';
import type { ArmazenamentoTexto } from '../estado/armazenamento';
import type { EstadoPop } from '../estado/pop';
import { CHAVE_POP, esquemaEstadoPop, gravarEstadoPop, lerEstadoPop } from '../estado/pop';

export type EscopoBackup = 'fpe' | 'pop' | 'completo';
export const ESCOPOS_BACKUP: readonly EscopoBackup[] = ['fpe', 'pop', 'completo'];
export const ROTULO_ESCOPO: Record<EscopoBackup, string> = { fpe: 'FPE', pop: 'POP', completo: 'FPE e POP' };
export const SCHEMA_BACKUP = 1;

/** Bloco que a API exige no HTML; os atributos ficam exatamente nesta ordem (o PHP procura este texto). */
export const ABERTURA_BLOCO_ESTADO = '<script type="application/json" id="lux-estado">';

const esquemaEstadoBackup = z.object({
  schema_versao: z.literal(SCHEMA_BACKUP),
  fpe_edicoes: esquemaEstado.shape.fpe_edicoes,
  pop_respostas: esquemaEstadoPop.shape.pop_respostas,
  gerado_em: z.string(),
});
export type EstadoBackup = z.infer<typeof esquemaEstadoBackup>;

/** Só o que o escopo cobre: um backup “fpe” não leva (nem restaura) as respostas do POP, e vice-versa. */
export function montarEstadoBackup(escopo: EscopoBackup, fpe: EstadoFpe, pop: EstadoPop, agora: Date): EstadoBackup {
  return {
    schema_versao: SCHEMA_BACKUP,
    fpe_edicoes: escopo === 'pop' ? {} : fpe.fpe_edicoes,
    pop_respostas: escopo === 'fpe' ? {} : pop.pop_respostas,
    gerado_em: agora.toISOString(),
  };
}

/**
 * JSON para dentro do bloco `<script>`: `<` vira o escape unicode de 6 caracteres (nada fecha o script antes da hora) e U+2028/2029 também são escapados.
 * O resultado continua sendo JSON válido e idêntico ao original depois de lido.
 */
// U+2028 e U+2029 montados por código: escritos direto, viram quebras de linha reais no fonte.
const SEP_LINHA = String.fromCharCode(0x2028);
const SEP_PARAGRAFO = String.fromCharCode(0x2029);

export function jsonSeguroParaHtml(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, '\\u003c').split(SEP_LINHA).join('\\u2028').split(SEP_PARAGRAFO).join('\\u2029');
}

export type LeituraDoBackup = { ok: true; estado: EstadoBackup } | { ok: false; erro: string };

/** Lê o estado de dentro de um backup `.html` (o mesmo que a API validou ao guardar). */
export function lerEstadoDoHtml(html: string): LeituraDoBackup {
  const inicio = html.indexOf(ABERTURA_BLOCO_ESTADO);
  if (inicio === -1) return { ok: false, erro: 'Este arquivo não é uma versão salva desta ferramenta (falta o bloco de estado).' };
  const fim = html.indexOf('</script>', inicio);
  if (fim === -1) return { ok: false, erro: 'O bloco de estado da versão está incompleto.' };
  let bruto: unknown;
  try {
    bruto = JSON.parse(html.slice(inicio + ABERTURA_BLOCO_ESTADO.length, fim));
  } catch {
    return { ok: false, erro: 'O bloco de estado da versão não é um JSON válido.' };
  }
  const r = esquemaEstadoBackup.safeParse(bruto);
  return r.success ? { ok: true, estado: r.data } : { ok: false, erro: 'O estado guardado nesta versão não tem o formato esperado.' };
}

// ---------------------------------------------------------------------------------------------
// Restaurar e desfazer
// ---------------------------------------------------------------------------------------------

export const CHAVE_DESFAZER = 'lux_desfazer_restauracao_v1';
const esquemaDesfazer = z.object({ criado_em: z.string(), fpe: esquemaEstado, pop: esquemaEstadoPop });

export interface ResultadoRestauracao {
  ok: boolean;
  /** fichas e respostas do backup que já não existem nesta versão da ferramenta e foram ignoradas. */
  ignoradas: number;
  /** o navegador recusou guardar (cota cheia, modo privado): nada foi alterado. */
  erro?: string;
}

/**
 * Restaura o backup no navegador. Escopo `fpe` troca só as edições do FPE; `pop` só as respostas do POP; `completo` os dois.
 * `fichaIds` / `perguntaIds` = o que existe hoje (o que sobrou de versões antigas é ignorado e contado).
 * ANTES de gravar guarda o estado atual em `lux_desfazer_restauracao_v1`; se essa cópia falhar, NÃO restaura.
 */
export function restaurarBackup(
  estado: EstadoBackup,
  escopo: EscopoBackup,
  existentes: { fichaIds: ReadonlySet<string>; perguntaIds: ReadonlySet<string> },
  agora: Date,
  storage: ArmazenamentoTexto | null = armazenamentoDoNavegador(),
): ResultadoRestauracao {
  if (!storage) return { ok: false, ignoradas: 0, erro: 'Este navegador não permite guardar dados: nada foi restaurado.' };
  const fpeAtual = lerEstadoFpe(storage).estado;
  const popAtual = lerEstadoPop(storage).estado;
  try {
    storage.setItem(CHAVE_DESFAZER, JSON.stringify({ criado_em: agora.toISOString(), fpe: fpeAtual, pop: popAtual }));
  } catch {
    return { ok: false, ignoradas: 0, erro: 'O navegador não guardou o ponto de desfazer: nada foi restaurado.' };
  }
  let ignoradas = 0;
  const filtrar = <T,>(origem: Record<string, T>, existe: ReadonlySet<string>) => {
    const saida: Record<string, T> = {};
    for (const [id, v] of Object.entries(origem)) {
      if (existe.has(id)) saida[id] = v;
      else ignoradas++;
    }
    return saida;
  };
  const fpe: EstadoFpe = escopo === 'pop' ? fpeAtual : { ...fpeAtual, fpe_edicoes: filtrar(estado.fpe_edicoes, existentes.fichaIds) };
  const pop: EstadoPop = escopo === 'fpe' ? popAtual : { ...popAtual, pop_respostas: filtrar(estado.pop_respostas, existentes.perguntaIds) };
  if (!gravarEstadoFpe(fpe, storage) || !gravarEstadoPop(pop, storage)) {
    // desfaz o que já tenha entrado: volta ao que havia
    gravarEstadoFpe(fpeAtual, storage);
    gravarEstadoPop(popAtual, storage);
    return { ok: false, ignoradas: 0, erro: 'O navegador não guardou a versão restaurada: nada foi alterado.' };
  }
  return { ok: true, ignoradas };
}

export function existeDesfazer(storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): boolean {
  try {
    const bruto = storage?.getItem(CHAVE_DESFAZER);
    return bruto ? esquemaDesfazer.safeParse(JSON.parse(bruto)).success : false;
  } catch {
    return false;
  }
}

/** Volta ao estado de antes da última restauração. O estado atual vira o novo ponto de desfazer (dá para refazer). */
export function desfazerRestauracao(agora: Date, storage: ArmazenamentoTexto | null = armazenamentoDoNavegador()): { ok: boolean; erro?: string } {
  if (!storage) return { ok: false, erro: 'Este navegador não permite guardar dados.' };
  let guardado: z.infer<typeof esquemaDesfazer>;
  try {
    const r = esquemaDesfazer.safeParse(JSON.parse(storage.getItem(CHAVE_DESFAZER) ?? 'null'));
    if (!r.success) return { ok: false, erro: 'Não há restauração para desfazer.' };
    guardado = r.data;
  } catch {
    return { ok: false, erro: 'Não há restauração para desfazer.' };
  }
  const fpeAgora = lerEstadoFpe(storage).estado;
  const popAgora = lerEstadoPop(storage).estado;
  try {
    storage.setItem(CHAVE_DESFAZER, JSON.stringify({ criado_em: agora.toISOString(), fpe: fpeAgora, pop: popAgora }));
  } catch {
    return { ok: false, erro: 'O navegador não guardou a cópia de segurança: nada foi desfeito.' };
  }
  if (!gravarEstadoFpe(guardado.fpe as EstadoFpe, storage) || !gravarEstadoPop(guardado.pop as EstadoPop, storage)) {
    gravarEstadoFpe(fpeAgora, storage);
    gravarEstadoPop(popAgora, storage);
    return { ok: false, erro: 'O navegador não guardou o estado anterior: nada foi alterado.' };
  }
  return { ok: true };
}

export const CHAVES_DO_ESTADO = [CHAVE_FPE, CHAVE_POP] as const;
