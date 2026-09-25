// Modelo de visão do FPE: junta a Matriz V08, as 236 fichas e as edições guardadas no que a tela desenha.
// Puro (sem React). O padrão vem do JSON; o que o usuário editou vem do estado (src/estado/armazenamento.ts).
import type { DocumentoFichas, Estagio, Ficha5w1h, MatrizV08, Setor } from '../../dados/tipos';
import type { CampoFicha, EstadoFpe, ValoresFicha } from '../../estado/armazenamento';
import { CAMPOS_FICHA, valoresEfetivos } from '../../estado/armazenamento';

/** Textos da interface para cada campo do 5W1H (copy da tela, não dado de negócio). */
export const CAMPOS: Record<CampoFicha, { rotulo: string; ajuda: string; linhas: number; erro: string }> = {
  what: { rotulo: 'O quê', ajuda: 'A ação, como está na Matriz. Se mudar o texto, o fluxograma passa a mostrar o novo texto.', linhas: 2, erro: 'Informe o quê: a ação desta ficha.' },
  why: { rotulo: 'Por quê', ajuda: 'O objetivo da ação para o estágio.', linhas: 3, erro: 'Informe por quê: o objetivo da ação.' },
  where: { rotulo: 'Onde', ajuda: 'Local ou canal onde a ação acontece. Só o que a Lux confirma.', linhas: 2, erro: 'Informe onde a ação acontece.' },
  when: { rotulo: 'Quando', ajuda: 'Estágio e gatilho da ação. Sem prazo que a Lux não tenha definido.', linhas: 2, erro: 'Informe quando a ação acontece.' },
  who: { rotulo: 'Quem', ajuda: 'Só função ou setor; sem nome de pessoa.', linhas: 2, erro: 'Informe quem faz: a função ou o setor.' },
  how: { rotulo: 'Como', ajuda: 'Passo a passo, com os dois caminhos das decisões IF/ELSE.', linhas: 5, erro: 'Informe como a ação é feita.' },
};

export interface FichaVisual {
  ficha: Ficha5w1h;
  /** valores originais (do JSON). */
  padrao: ValoresFicha;
  /** valores em vigor: o padrão com as edições por cima. */
  valores: ValoresFicha;
  editada: boolean;
  camposEditados: CampoFicha[];
  /** a ação da ficha é uma decisão IF/ELSE. */
  ifElse: boolean;
}

export interface EstagioFpe {
  estagio: Estagio;
  /** “02” */
  numero: string;
  fichas: FichaVisual[];
}

export interface SetorFpe {
  setor: Setor;
  estagios: EstagioFpe[];
  totalFichas: number;
  totalEditadas: number;
}

export interface Fpe {
  setores: SetorFpe[];
  totalFichas: number;
  totalEditadas: number;
}

export interface Selecao {
  setorId: string;
  estagioId: number;
  fichaId: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export const valoresPadrao = (f: Ficha5w1h): ValoresFicha => ({ what: f.what, why: f.why, where: f.where, when: f.when, who: f.who, how: f.how });

export function montarFpe(v08: MatrizV08, doc: DocumentoFichas, estado: EstadoFpe): Fpe {
  const acaoPorId = new Map(v08.acoes.map((a) => [a.id, a]));
  const visuais = new Map<string, FichaVisual[]>(); // "setor|estagio" → fichas
  for (const ficha of doc.fichas) {
    const edicao = estado.fpe_edicoes[ficha.id];
    const padrao = valoresPadrao(ficha);
    const chave = `${ficha.setor_id}|${ficha.estagio_id}`;
    const camposEditados = CAMPOS_FICHA.filter((c) => edicao?.campos[c] !== undefined);
    visuais.set(chave, [
      ...(visuais.get(chave) ?? []),
      { ficha, padrao, valores: valoresEfetivos(padrao, edicao), editada: camposEditados.length > 0, camposEditados, ifElse: acaoPorId.get(ficha.acao_id)?.e_condicional ?? false },
    ]);
  }
  const ordem = (f: FichaVisual) => acaoPorId.get(f.ficha.acao_id)?.ordem ?? 0;
  const setores: SetorFpe[] = v08.setores
    .map((setor) => {
      const estagios: EstagioFpe[] = v08.estagios
        .map((estagio) => ({ estagio, numero: pad2(estagio.numero), fichas: [...(visuais.get(`${setor.id}|${estagio.id}`) ?? [])].sort((a, b) => ordem(a) - ordem(b)) }))
        .filter((e) => e.fichas.length > 0);
      const todas = estagios.flatMap((e) => e.fichas);
      return { setor, estagios, totalFichas: todas.length, totalEditadas: todas.filter((f) => f.editada).length };
    })
    .filter((s) => s.totalFichas > 0);
  return { setores, totalFichas: doc.fichas.length, totalEditadas: setores.reduce((soma, s) => soma + s.totalEditadas, 0) };
}

/** Seleção válida mais próxima do pedido: setor → estágio → ficha, caindo no primeiro item existente quando algo some. */
export function resolverSelecao(fpe: Fpe, pedido?: Partial<Selecao>): Selecao | null {
  const setor = fpe.setores.find((s) => s.setor.id === pedido?.setorId) ?? fpe.setores[0];
  if (!setor) return null;
  const estagio = setor.estagios.find((e) => e.estagio.id === pedido?.estagioId) ?? setor.estagios[0];
  if (!estagio) return null;
  const ficha = estagio.fichas.find((f) => f.ficha.id === pedido?.fichaId) ?? estagio.fichas[0];
  if (!ficha) return null;
  return { setorId: setor.setor.id, estagioId: estagio.estagio.id, fichaId: ficha.ficha.id };
}

/**
 * A Matriz que alimenta o fluxograma: idêntica à V08, exceto o texto das ações cujo “O quê” foi editado.
 * “O quê” esvaziado não vira nó em branco: vale o texto original até a pessoa preencher de novo.
 */
export function matrizComEdicoes(v08: MatrizV08, doc: DocumentoFichas, estado: EstadoFpe): MatrizV08 {
  const novoTexto = new Map<string, string>();
  for (const ficha of doc.fichas) {
    const o = estado.fpe_edicoes[ficha.id]?.campos.what;
    if (o !== undefined && o.trim() !== '') novoTexto.set(ficha.acao_id, o);
  }
  if (novoTexto.size === 0) return v08;
  return { ...v08, acoes: v08.acoes.map((a) => (novoTexto.has(a.id) ? { ...a, texto: novoTexto.get(a.id)! } : a)) };
}
