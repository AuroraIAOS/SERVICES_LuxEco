// matriz_v08.json + fichas_autoria.json (+ anotacoes_v08.json) → data/conteudo/fichas_5w1h.json.
// A autoria (escrita à mão a partir dos documentos) traz o "porquê" e o "como" de cada ação; o gerador acrescenta o que é
// determinístico (o quê, quem, onde/quando padrão, condicionais, fontes) e recusa qualquer ação sem autoria.
// Regras de conteúdo: docs/06 §4 — nada inventado, sem R$, sem prazo numérico, "quem" só função/setor e equipes nomeadas na Matriz.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Acao, Ficha5w1h, FonteFicha, MatrizV08 } from '../src/dados/tipos.ts';
import { faseDoEstagio } from '../src/dados/tipos.ts';
import type { AnotacoesV08 } from './compor_v08.ts';
import { JSON_ANOTACOES, JSON_V08 } from './compor_v08.ts';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
export const JSON_AUTORIA = resolve(RAIZ, 'data/conteudo/fichas_autoria.json');
export const JSON_FICHAS = resolve(RAIZ, 'data/conteudo/fichas_5w1h.json');

/** Atalhos usados na autoria: `"mapa:Est. 07 — Canal temporário"` → { arquivo, trecho }. */
export const ARQUIVOS_FONTE: Record<string, string> = {
  matriz: 'data/fontes/Matriz_Operacional.xlsx',
  rel: 'data/fontes/Relatorio_Operacional_V07.md',
  mapa: 'data/fontes/Mapa_Organizacional.md',
  anot: 'data/fontes/Anotacoes_CEO_2026-09-24.md',
};

export interface AutoriaFicha {
  why: string;
  how: string;
  /** chave de `locais` ou texto livre; padrão = `setores[setor].onde_padrao`. */
  onde?: string;
  /** gatilho da ação; padrão = `estagios[estagio].gatilho`. */
  quando?: string;
  /** substitui o `who` do setor (ex.: Est. 19 — Equipe Técnica e Vendas). */
  quem?: string;
  /** só quando há inferência do consultor além do que os documentos dizem. */
  origem?: 'sugerido';
  /** fontes extras: `"alias:trecho"`. */
  fontes?: string[];
}

export interface Autoria {
  meta: { atualizado_em: string; regra: string; fases_autoradas: number[] };
  setores: Record<string, { who: string; onde_padrao: string; trecho: string }>;
  estagios: Record<string, { objetivo: string; gatilho: string; trecho: string }>;
  locais: Record<string, string>;
  /** para textos de ação que se repetem (ex.: "Monitora métricas do setor"); aceita {num} {nome} {setor}. */
  modelos: Record<string, Omit<AutoriaFicha, 'quem' | 'origem' | 'fontes'> & { origem?: 'sugerido' }>;
  fichas: Record<string, AutoriaFicha>;
}

export interface DocumentoFichas {
  meta: { versao_matriz: string; gerado_de: string[]; fases_autoradas: number[]; total: number };
  fichas: Ficha5w1h[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const preencher = (t: string, c: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k: string) => c[k] ?? m);
const fimDeFrase = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);

export function resolverFonte(atalho: string): FonteFicha {
  const i = atalho.indexOf(':');
  const alias = i < 0 ? atalho : atalho.slice(0, i);
  const arquivo = ARQUIVOS_FONTE[alias];
  if (!arquivo) throw new Error(`Fonte "${atalho}": alias "${alias}" desconhecido (use ${Object.keys(ARQUIVOS_FONTE).join(', ')})`);
  const trecho = i < 0 ? '' : atalho.slice(i + 1).trim();
  if (!trecho) throw new Error(`Fonte "${atalho}": informe o trecho depois de "${alias}:"`);
  return { arquivo, trecho };
}

/** Gera as fichas das fases já autoradas. Falha com a lista completa do que falta ou sobra. */
export function gerarFichas(v08: MatrizV08, autoria: Autoria, overlay: AnotacoesV08): DocumentoFichas {
  const fases = new Set(autoria.meta.fases_autoradas);
  const setorPorId = new Map(v08.setores.map((s) => [s.id, s]));
  const estagioPorId = new Map(v08.estagios.map((e) => [e.id, e]));
  const condPorAcao = new Map(v08.condicionais.map((c) => [c.acao_id, c]));
  const acoesDaFase = v08.acoes.filter((a) => fases.has(faseDoEstagio(a.estagio_id)));

  const problemas: string[] = [];
  const idsFase = new Set(acoesDaFase.map((a) => a.id));
  for (const id of Object.keys(autoria.fichas)) {
    if (!idsFase.has(id)) problemas.push(`autoria.fichas["${id}"]: ação inexistente ou fora das fases autoradas (${[...fases].join(', ')})`);
  }
  const textosFase = new Set(acoesDaFase.map((a) => a.texto));
  for (const t of Object.keys(autoria.modelos)) {
    if (!textosFase.has(t)) problemas.push(`autoria.modelos["${t}"]: nenhuma ação das fases autoradas usa este texto`);
  }

  const fichas: Ficha5w1h[] = [];
  for (const a of acoesDaFase) {
    const setor = setorPorId.get(a.setor_id);
    const estagio = estagioPorId.get(a.estagio_id);
    const cfgSetor = autoria.setores[a.setor_id];
    const cfgEst = autoria.estagios[String(a.estagio_id)];
    const proprio = autoria.fichas[a.id];
    const modelo = autoria.modelos[a.texto];
    if (!setor || !estagio || !cfgSetor || !cfgEst) {
      problemas.push(`${a.id}: autoria sem o setor ${a.setor_id} ou o estágio ${a.estagio_id}`);
      continue;
    }
    if (proprio && modelo) problemas.push(`${a.id}: tem ficha própria e também cai no modelo "${a.texto}" — escolha um`);
    const cfg = proprio ?? modelo;
    if (!cfg) {
      problemas.push(`${a.id}: sem autoria (nem ficha própria, nem modelo) — "${a.texto}"`);
      continue;
    }
    const ctx = { num: pad2(a.estagio_id), nome: estagio.nome, setor: setor.nome };
    const local = (chave: string) => autoria.locais[chave] ?? chave;
    const cond = condPorAcao.get(a.id);
    const how = cond
      ? `${fimDeFrase(preencher(cfg.how, ctx))} Condicional: se “${cond.se_sim.rotulo}”, ${cond.se_sim.texto}; se “${cond.se_nao.rotulo}”, ${cond.se_nao.texto}.`
      : fimDeFrase(preencher(cfg.how, ctx));

    let fonteInicial: FonteFicha;
    if (a.origem_doc) {
      const idx = Number(a.celula.replace('V08-', '')) - 1;
      const sec = overlay.celulas_novas[idx]?.fonte_secao;
      if (!sec) problemas.push(`${a.id}: célula ${a.celula} sem fonte_secao no overlay`);
      fonteInicial = { arquivo: ARQUIVOS_FONTE.anot!, trecho: `§${sec ?? '?'}` };
    } else {
      fonteInicial = { arquivo: ARQUIVOS_FONTE.matriz!, trecho: `Célula ${a.celula} — ${setor.nome} × Est. ${ctx.num}` };
    }
    const extras: string[] = 'fontes' in cfg && cfg.fontes ? cfg.fontes : [];
    let fontes: FonteFicha[] = [];
    try {
      fontes = [
        fonteInicial,
        { arquivo: ARQUIVOS_FONTE.rel!, trecho: cfgEst.trecho },
        { arquivo: ARQUIVOS_FONTE.rel!, trecho: cfgSetor.trecho },
        ...extras.map(resolverFonte),
      ];
    } catch (e) {
      problemas.push(`${a.id}: ${(e as Error).message}`);
    }

    fichas.push({
      id: `ficha_${a.id.replace(/^acao_/, '')}`,
      acao_id: a.id,
      setor_id: a.setor_id,
      estagio_id: a.estagio_id,
      what: a.texto,
      why: preencher(cfg.why, ctx),
      where: local(preencher(cfg.onde ?? cfgSetor.onde_padrao, ctx)),
      when: `Est. ${ctx.num} — ${estagio.nome}: ${preencher(cfg.quando ?? cfgEst.gatilho, ctx)}`,
      who: proprio?.quem ?? cfgSetor.who,
      how,
      origem: cfg.origem === 'sugerido' ? 'sugerido' : 'documentado',
      fontes,
      atualizado_em: autoria.meta.atualizado_em,
    });
  }
  if (problemas.length) throw new Error(`Autoria das fichas incompleta:\n - ${problemas.join('\n - ')}`);

  return {
    meta: {
      versao_matriz: v08.meta.versao_matriz,
      gerado_de: ['data/matriz_v08.json', 'data/conteudo/fichas_autoria.json', 'data/conteudo/anotacoes_v08.json'],
      fases_autoradas: [...autoria.meta.fases_autoradas].sort((x, y) => x - y),
      total: fichas.length,
    },
    fichas,
  };
}

/** Só para conferir cobertura por ação sem repetir o cálculo nos testes. */
export const acoesSemFicha = (v08: MatrizV08, doc: DocumentoFichas): Acao[] => {
  const com = new Set(doc.fichas.map((f) => f.acao_id));
  return v08.acoes.filter((a) => doc.meta.fases_autoradas.includes(faseDoEstagio(a.estagio_id)) && !com.has(a.id));
};

const lerJson = <T>(caminho: string): T => JSON.parse(readFileSync(caminho, 'utf8')) as T;

export const serializarFichas = (doc: DocumentoFichas) => JSON.stringify(doc, null, 2) + '\n';

export function gerarDosArquivos(): DocumentoFichas {
  return gerarFichas(lerJson<MatrizV08>(JSON_V08), lerJson<Autoria>(JSON_AUTORIA), lerJson<AnotacoesV08>(JSON_ANOTACOES));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const doc = gerarDosArquivos();
    writeFileSync(JSON_FICHAS, serializarFichas(doc), 'utf8');
    const sug = doc.fichas.filter((f) => f.origem === 'sugerido').length;
    console.log(`OK fichas geradas: fases=${doc.meta.fases_autoradas.join(',')} total=${doc.meta.total} sugeridas=${sug}`);
  } catch (e) {
    console.log(`ERRO: ${(e as Error).message}`);
    process.exit(1);
  }
}
