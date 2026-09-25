// Regras puras da tela “Versões salvas” (03.6): filtro, busca, ordenação, seleção (que sobrevive ao filtrar/ordenar), proteção e índice.
import type { Versao } from '../../backup/cliente';
import type { EscopoBackup } from '../../backup/estado';

export type OrdemVersoes = 'recentes' | 'antigas';
export type FiltroEscopo = 'todos' | EscopoBackup;

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtra por escopo, busca no rótulo (sem acento e sem diferenciar maiúsculas) e ordena por data. */
export function filtrarEOrdenar(itens: readonly Versao[], o: { escopo: FiltroEscopo; busca: string; ordem: OrdemVersoes }): Versao[] {
  const termo = semAcento(o.busca.trim());
  const filtrados = itens.filter((v) => (o.escopo === 'todos' || v.escopo === o.escopo) && (termo === '' || semAcento(v.rotulo).includes(termo)));
  const data = (v: Versao) => Date.parse(v.criado_em) || 0;
  return [...filtrados].sort((a, b) => (o.ordem === 'recentes' ? data(b) - data(a) : data(a) - data(b)) || (o.ordem === 'recentes' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)));
}

export type EstadoSelecao = 'nenhuma' | 'algumas' | 'todas';

/** Estado do “selecionar todas” sobre o que está VISÍVEL (indeterminado quando só parte está marcada). */
export function estadoDaSelecao(visiveis: readonly Versao[], selecionadas: ReadonlySet<string>): EstadoSelecao {
  const marcadas = visiveis.filter((v) => selecionadas.has(v.id)).length;
  return marcadas === 0 ? 'nenhuma' : marcadas === visiveis.length ? 'todas' : 'algumas';
}

/** “Selecionar todas”: se todas as visíveis já estão marcadas, desmarca só elas; senão marca todas as visíveis. As outras seleções ficam. */
export function alternarTodas(visiveis: readonly Versao[], selecionadas: ReadonlySet<string>): Set<string> {
  const novo = new Set(selecionadas);
  const todas = estadoDaSelecao(visiveis, selecionadas) === 'todas';
  for (const v of visiveis) {
    if (todas) novo.delete(v.id);
    else novo.add(v.id);
  }
  return novo;
}

export function alternarUma(selecionadas: ReadonlySet<string>, id: string): Set<string> {
  const novo = new Set(selecionadas);
  if (novo.has(id)) novo.delete(id);
  else novo.add(id);
  return novo;
}

/** Tira da seleção o que já não existe (depois de excluir ou recarregar). */
export const podarSelecao = (selecionadas: ReadonlySet<string>, itens: readonly Versao[]): Set<string> => {
  const existentes = new Set(itens.map((v) => v.id));
  return new Set([...selecionadas].filter((id) => existentes.has(id)));
};

/** Exclusão em lote: protegidas ficam de fora e são avisadas. */
export function separarProtegidas(itens: readonly Versao[], ids: ReadonlySet<string>): { excluir: Versao[]; protegidas: Versao[] } {
  const escolhidas = itens.filter((v) => ids.has(v.id));
  return { excluir: escolhidas.filter((v) => !v.protegido), protegidas: escolhidas.filter((v) => v.protegido) };
}

/** Aviso do contador “n de 10”: a partir de 8 versões (ou a 1 vaga do limite) a tela avisa. */
export function avisoDeLimite(total: number, limite: number): 'ok' | 'perto' | 'cheio' {
  if (total >= limite) return 'cheio';
  return total >= Math.min(8, limite - 1) ? 'perto' : 'ok';
}

export const AVISO_A_PARTIR_DE = 8;

/** Índice das versões (só metadados, sem conteúdo) para a pessoa guardar ou conferir. */
export function indiceJson(itens: readonly Versao[], limite: number, agora: Date): string {
  return `${JSON.stringify(
    {
      formato: 'lux_indice_versoes',
      formato_versao: 1,
      exportado_em: agora.toISOString(),
      limite,
      total: itens.length,
      versoes: itens.map(({ id, rotulo, escopo, criado_em, tamanho_bytes, sha256, versao_app, protegido }) => ({ id, rotulo, escopo, criado_em, tamanho_bytes, sha256, versao_app, protegido })),
    },
    null,
    2,
  )}\n`;
}

export const tamanhoLegivel = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kB` : `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`);
