// Regras de integridade de docs/02_MODELO_DE_DADOS.md. Ativas: 1, 2, 8 (01.4) e 3 — V08 (02.1), + integridade referencial e mapa de condicionais.
// As regras de fichas (4–5) e bibliotecas (6–7) ficam inativas até existirem os arquivos delas.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Condicional, Matriz, MatrizV08 } from '../src/dados/tipos.ts';
import { faseDoEstagio } from '../src/dados/tipos.ts';
import { comparar, HTML_LEGADO, lerJson, lerLegado } from './comparar_mmo_legado.ts';
import { compor, JSON_ANOTACOES, JSON_MAPA, JSON_V08 } from './compor_v08.ts';
import type { AnotacoesV08 } from './compor_v08.ts';
import { gerarFichas, JSON_AUTORIA, JSON_FICHAS, serializarFichas } from './gerar_fichas.ts';
import type { Autoria, DocumentoFichas } from './gerar_fichas.ts';
import { JSON_V07, lerMatriz, serializar, textoOriginalIfElse } from './xlsx_para_json.ts';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
export const ESPERADO_V07 = { setores: 12, estagios: 22, celulas: 212, if_else: 31, situacoes: 15 };

export interface MapaCondicionais {
  situacoes: {
    id: string;
    numero: number;
    setor_id: string;
    estagios_mapa: number[];
    estagios_planilha: number[];
    divergencia_estagio: boolean;
    condicionais_ids: string[];
    participantes: { condicional_id: string }[];
  }[];
  sem_situacao: { condicional_id: string }[];
}

const duplicados = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i);

/** Regra 1 — 12 setores, 22 estágios, ids únicos (vale para V07 e V08). */
function validarRegra1(m: Matriz): string[] {
  const erros: string[] = [];
  if (m.setores.length !== ESPERADO_V07.setores) erros.push(`Regra 1: esperados ${ESPERADO_V07.setores} setores, achou ${m.setores.length}`);
  if (m.estagios.length !== ESPERADO_V07.estagios) erros.push(`Regra 1: esperados ${ESPERADO_V07.estagios} estágios, achou ${m.estagios.length}`);
  for (const [nome, ids] of [
    ['setores', m.setores.map((s) => s.id)],
    ['estagios', m.estagios.map((e) => String(e.id))],
    ['acoes', m.acoes.map((a) => a.id)],
    ['condicionais', m.condicionais.map((c) => c.id)],
  ] as const) {
    const d = duplicados([...ids]);
    if (d.length) erros.push(`Regra 1: ids duplicados em ${nome}: ${[...new Set(d)].join(', ')}`);
  }
  return erros;
}

/** Integridade referencial (setor/estágio existentes, ordem 1..n, condicional ↔ ação). Vale para V07 e V08. */
function validarIntegridade(m: Matriz): string[] {
  const erros: string[] = [];
  const setores = new Set(m.setores.map((s) => s.id));
  const estagios = new Set(m.estagios.map((e) => e.id));
  const acoes = new Map(m.acoes.map((a) => [a.id, a]));
  for (const a of m.acoes) {
    if (!setores.has(a.setor_id)) erros.push(`${a.id}: setor_id "${a.setor_id}" inexistente`);
    if (!estagios.has(a.estagio_id)) erros.push(`${a.id}: estagio_id ${a.estagio_id} inexistente`);
  }
  const ordens = new Map<string, number[]>();
  for (const a of m.acoes) ordens.set(`${a.setor_id}|${a.estagio_id}`, [...(ordens.get(`${a.setor_id}|${a.estagio_id}`) ?? []), a.ordem]);
  for (const [k, o] of ordens) if (o.some((v, i) => v !== i + 1)) erros.push(`Ordem não contígua (1..n) em ${k}: ${o.join(',')}`);
  for (const c of m.condicionais) {
    const a = acoes.get(c.acao_id);
    if (!a) erros.push(`${c.id}: acao_id "${c.acao_id}" inexistente`);
    else {
      if (!a.e_condicional) erros.push(`${c.id}: a ação ${a.id} não é marcada como condicional`);
      if (a.texto !== c.pergunta) erros.push(`${c.id}: pergunta difere do texto da ação`);
      if (textoOriginalIfElse(a, c).includes('undefined')) erros.push(`${c.id}: ramos incompletos`);
    }
    if (!c.se_sim.texto || !c.se_nao.texto) erros.push(`${c.id}: ramo vazio`);
  }
  for (const e of m.estagios) if (![1, 2, 3, 4].includes(e.fase_id)) erros.push(`Estágio ${e.id}: fase_id inválida`);
  return erros;
}

/** Regras 1 e 2 + integridade referencial da V07. Devolve a lista de erros (vazia = ok). */
export function validarV07(m: Matriz): string[] {
  const erros: string[] = [...validarRegra1(m)];
  // Regra 2 — V07: 212 células e 31 IF/ELSE
  if (m.acoes.length !== ESPERADO_V07.celulas) erros.push(`Regra 2: esperadas ${ESPERADO_V07.celulas} células, achou ${m.acoes.length}`);
  const ifElse = m.acoes.filter((a) => a.e_condicional).length;
  if (ifElse !== ESPERADO_V07.if_else) erros.push(`Regra 2: esperados ${ESPERADO_V07.if_else} IF/ELSE, achou ${ifElse}`);
  if (m.condicionais.length !== ifElse) erros.push(`Regra 2: ${m.condicionais.length} condicionais para ${ifElse} ações IF/ELSE`);
  erros.push(...validarIntegridade(m));
  return erros;
}

const SEM_CIFRA = /R\$\s*\d/;
const SEM_PRAZO = /\b\d+\s*(?:dias?|horas?|minutos?|semanas?|meses|mês)\b/i;
/** A V08 só acrescenta `situacao_id` às condicionais da V07; o resto tem de ficar idêntico. */
const semSituacao = (c: Condicional | undefined) => {
  if (!c) return undefined;
  const { situacao_id: _ignorado, ...resto } = c;
  return resto;
};
const traz_cifra_ou_prazo =(t: string) => SEM_CIFRA.test(t) || SEM_PRAZO.test(t);

/**
 * Regra 3 (V08): `células_v08 > células_v07`, `condicionais_v08 > condicionais_v07`, toda ação nova com `origem_doc`,
 * nada da V07 alterado (posição, texto, ramos) e conteúdo novo sem cifra em R$ nem prazo numérico (docs/06 §4).
 * `esperado` é o que o overlay produz hoje (compor); se o arquivo divergir dele, está desatualizado.
 */
export function validarV08(v08: MatrizV08, v07: Matriz, mapa: MapaCondicionais, esperado?: MatrizV08): string[] {
  const erros: string[] = [...validarRegra1(v08), ...validarIntegridade(v08)];
  if (v08.meta.versao_matriz !== 'V08') erros.push(`Regra 3: meta.versao_matriz deveria ser "V08" (achou "${v08.meta.versao_matriz}")`);
  if (v08.acoes.length <= v07.acoes.length) erros.push(`Regra 3: células_v08 (${v08.acoes.length}) deve superar as ${v07.acoes.length} da V07`);
  if (v08.condicionais.length <= v07.condicionais.length) erros.push(`Regra 3: condicionais_v08 (${v08.condicionais.length}) deve superar as ${v07.condicionais.length} da V07`);
  const ifElse = v08.acoes.filter((a) => a.e_condicional).length;
  if (v08.condicionais.length !== ifElse) erros.push(`Regra 3: ${v08.condicionais.length} condicionais para ${ifElse} ações IF/ELSE`);

  // Nada da V07 mudou: mesmas estruturas, mesmas ações na mesma posição, mesmas condicionais (só ganham situacao_id).
  if (JSON.stringify(v08.fases) !== JSON.stringify(v07.fases)) erros.push('Regra 3: as fases da V08 diferem da V07');
  if (JSON.stringify(v08.setores) !== JSON.stringify(v07.setores)) erros.push('Regra 3: os setores da V08 diferem da V07 (não renomear nem reordenar)');
  if (JSON.stringify(v08.estagios) !== JSON.stringify(v07.estagios)) erros.push('Regra 3: os estágios da V08 diferem da V07 (não renomear nem reordenar)');
  v07.acoes.forEach((a, i) => {
    if (JSON.stringify(v08.acoes[i]) !== JSON.stringify(a)) erros.push(`Regra 3: a ação ${a.id} da V07 foi alterada ou mudou de posição`);
  });
  v07.condicionais.forEach((c, i) => {
    if (JSON.stringify(semSituacao(v08.condicionais[i])) !== JSON.stringify(semSituacao(c))) erros.push(`Regra 3: a condicional ${c.id} da V07 foi alterada ou mudou de posição`);
  });

  // Toda ação nova tem origem_doc; nenhuma ação da V07 ganhou origem_doc.
  const idsV07 = new Set(v07.acoes.map((a) => a.id));
  const novas = v08.acoes.filter((a) => !idsV07.has(a.id));
  for (const a of novas) if (!a.origem_doc) erros.push(`Regra 3: a ação nova ${a.id} não tem origem_doc`);
  for (const a of v08.acoes) if (idsV07.has(a.id) && a.origem_doc) erros.push(`Regra 3: a ação ${a.id} é da V07 e não pode ter origem_doc`);

  // Conteúdo novo: nenhuma cifra em R$ e nenhum prazo numérico (SLA) que os documentos não tragam.
  const idsNovas = new Set(novas.map((a) => a.id));
  for (const a of novas) if (traz_cifra_ou_prazo(a.texto)) erros.push(`Conteúdo: ${a.id} traz cifra em R$ ou prazo numérico ("${a.texto}")`);
  for (const c of v08.condicionais) {
    if (!idsNovas.has(c.acao_id)) continue;
    for (const t of [c.se_sim.rotulo, c.se_sim.texto, c.se_nao.rotulo, c.se_nao.texto]) {
      if (traz_cifra_ou_prazo(t)) erros.push(`Conteúdo: ${c.id} traz cifra em R$ ou prazo numérico ("${t}")`);
    }
  }

  // situacao_id vem do mapa das 15 situações (vínculo direto + participantes) e só existe no que o mapa cobre.
  const situacaoDoMapa = new Map<string, string>();
  for (const s of mapa.situacoes) {
    for (const id of s.condicionais_ids) situacaoDoMapa.set(id, s.id);
    for (const p of s.participantes) situacaoDoMapa.set(p.condicional_id, s.id);
  }
  const idsCondV07 = new Set(v07.condicionais.map((c) => c.id));
  for (const c of v08.condicionais) {
    const esperada = idsCondV07.has(c.id) ? situacaoDoMapa.get(c.id) : undefined;
    if (c.situacao_id !== esperada) erros.push(`Regra 3: ${c.id} com situacao_id "${c.situacao_id ?? '—'}" (o mapa manda "${esperada ?? '—'}")`);
  }

  // Blocos do overlay que não são células (perfis, leads, oportunidades, respostas-padrão).
  const unicos = (nome: string, ids: string[]) => {
    const d = duplicados(ids);
    if (d.length) erros.push(`V08: ids duplicados em ${nome}: ${[...new Set(d)].join(', ')}`);
  };
  if (v08.perfis_cliente.length < 4) erros.push(`V08: esperados ≥ 4 perfis de cliente (Anotações §1.1), achou ${v08.perfis_cliente.length}`);
  unicos('perfis_cliente', v08.perfis_cliente.map((p) => p.id));
  for (const p of v08.perfis_cliente) if (!p.nome || !p.criterios || !p.proxima_acao) erros.push(`V08: perfil ${p.id} com campo vazio`);
  if (v08.classificacao_lead.map((l) => l.id).sort().join() !== 'lead_frio,lead_morno,lead_quente') erros.push('V08: classificacao_lead deve ter exatamente Quente, Morno e Frio');
  for (const l of v08.classificacao_lead) if (l.criterios.length === 0) erros.push(`V08: ${l.id} sem critérios`);
  unicos('oportunidades', v08.oportunidades.map((o) => o.id));
  const estagios = new Set(v08.estagios.map((e) => e.id));
  for (const o of v08.oportunidades) {
    if (!['alta', 'media', 'baixa'].includes(o.prioridade_padrao)) erros.push(`V08: ${o.id} com prioridade_padrao inválida`);
    if (!estagios.has(o.estagio_id)) erros.push(`V08: ${o.id} com estagio_id inexistente`);
    if (!['documentado', 'sugerido', 'manual'].includes(o.origem)) erros.push(`V08: ${o.id} com origem inválida`);
  }
  if (v08.oportunidades.length < 10) erros.push(`V08: esperadas ≥ 10 oportunidades (Anotações §1.4), achou ${v08.oportunidades.length}`);
  unicos('respostas_padrao', v08.respostas_padrao.map((r) => r.id));
  for (const r of v08.respostas_padrao) if (!r.tema || !r.texto) erros.push(`V08: resposta ${r.id} com campo vazio`);

  // O arquivo tem que ser exatamente o que o overlay produz hoje.
  if (esperado && serializar(esperado) !== serializar(v08)) {
    erros.push('Regra 3: matriz_v08.json está desatualizada em relação a matriz_v07.json + anotacoes_v08.json — rode `npm run dados:compor`.');
  }
  return erros;
}

/** Mapa das 15 situações: toda condicional aparece exatamente uma vez; setores coerentes; divergências de estágio declaradas. */
export function validarMapa(m: Matriz, mapa: MapaCondicionais): string[] {
  const erros: string[] = [];
  if (mapa.situacoes.length !== ESPERADO_V07.situacoes) erros.push(`Mapa: esperadas ${ESPERADO_V07.situacoes} situações, achou ${mapa.situacoes.length}`);
  const porId = new Map(m.condicionais.map((c) => [c.id, c]));
  const acaoPorId = new Map(m.acoes.map((a) => [a.id, a]));
  const usados: string[] = [];
  for (const s of mapa.situacoes) {
    if (s.condicionais_ids.length === 0) erros.push(`${s.id}: sem célula de vínculo direto`);
    for (const id of s.condicionais_ids) {
      const c = porId.get(id);
      const a = c && acaoPorId.get(c.acao_id);
      if (!a) erros.push(`${s.id}: condicional "${id}" inexistente`);
      else if (a.setor_id !== s.setor_id) erros.push(`${s.id}: ${id} é de outro setor (${a.setor_id})`);
    }
    const est = [...new Set(s.condicionais_ids.map((id) => acaoPorId.get(porId.get(id)?.acao_id ?? '')?.estagio_id ?? -1))].sort((x, y) => x - y);
    if (est.join() !== [...s.estagios_planilha].sort((x, y) => x - y).join()) erros.push(`${s.id}: estagios_planilha desatualizado (calculado ${est.join(',')})`);
    const diverge = !est.every((e) => s.estagios_mapa.includes(e));
    if (diverge !== s.divergencia_estagio) erros.push(`${s.id}: divergencia_estagio deveria ser ${diverge}`);
    usados.push(...s.condicionais_ids, ...s.participantes.map((p) => p.condicional_id));
  }
  usados.push(...mapa.sem_situacao.map((x) => x.condicional_id));
  const dup = duplicados(usados);
  if (dup.length) erros.push(`Mapa: condicionais em mais de um lugar: ${[...new Set(dup)].join(', ')}`);
  const faltam = m.condicionais.map((c) => c.id).filter((id) => !usados.includes(id));
  if (faltam.length) erros.push(`Mapa: condicionais sem destino: ${faltam.join(', ')}`);
  const extras = usados.filter((id) => !porId.has(id));
  if (extras.length) erros.push(`Mapa: ids inexistentes: ${extras.join(', ')}`);
  return erros;
}

/** Nomes de pessoas internas da Lux que nunca podem aparecer nas fichas (docs/06 §4: “who” só função/setor). */
const NOMES_INTERNOS_PROIBIDOS = /\bLuan\b/;
const CAMPOS_TEXTO_FICHA = ['what', 'why', 'where', 'when', 'who', 'how'] as const;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Regras 4 e 5 (docs/02): uma ficha por ação; nenhuma órfã; nenhum campo 5W1H vazio; `who` sem nome de pessoa interna.
 * `fase` limita a cobertura exigida (02.2–02.5); sem `fase`, exige as 236 (todas as fases). `esperado` é o que o gerador produz hoje.
 */
export function validarFichas(v08: MatrizV08, doc: DocumentoFichas, autoria: Autoria, fase?: number, esperado?: DocumentoFichas): string[] {
  const erros: string[] = [];
  const acaoPorId = new Map(v08.acoes.map((a) => [a.id, a]));
  const permitidas = new Set(['Lux', ...Object.values(autoria.setores).flatMap((s) => s.who.match(/\p{Lu}[\p{L}\d]*/gu) ?? [])]);

  const ids = doc.fichas.map((f) => f.id);
  const acoes = doc.fichas.map((f) => f.acao_id);
  if (duplicados(ids).length) erros.push(`Regra 4: ids de ficha duplicados: ${[...new Set(duplicados(ids))].join(', ')}`);
  if (duplicados(acoes).length) erros.push(`Regra 4: mais de uma ficha para a mesma ação: ${[...new Set(duplicados(acoes))].join(', ')}`);

  for (const f of doc.fichas) {
    const a = acaoPorId.get(f.acao_id);
    if (!a) {
      erros.push(`Regra 4: ficha ${f.id} órfã (ação "${f.acao_id}" inexistente na V08)`);
      continue;
    }
    if (f.id !== `ficha_${a.id.replace(/^acao_/, '')}`) erros.push(`${f.id}: id deveria ser ficha_${a.id.replace(/^acao_/, '')}`);
    if (f.setor_id !== a.setor_id || f.estagio_id !== a.estagio_id) erros.push(`${f.id}: setor/estágio diferem da ação ${a.id}`);
    if (f.what !== a.texto) erros.push(`${f.id}: what difere do texto da ação (não reescrever a Matriz)`);
    for (const campo of CAMPOS_TEXTO_FICHA) {
      const valor = f[campo];
      if (typeof valor !== 'string' || !valor.trim()) {
        erros.push(`Regra 5: ${f.id} com campo ${campo} vazio`);
        continue;
      }
      if (NOMES_INTERNOS_PROIBIDOS.test(valor)) erros.push(`Regra 5: ${f.id} cita pessoa interna no campo ${campo}`);
      if (campo !== 'what' && traz_cifra_ou_prazo(valor)) erros.push(`Conteúdo: ${f.id} traz cifra em R$ ou prazo numérico em ${campo} ("${valor}")`);
    }
    for (const palavra of f.who.match(/\p{Lu}[\p{L}\d]*/gu) ?? []) {
      if (!permitidas.has(palavra)) erros.push(`Regra 5: ${f.id} com who “${f.who}” — “${palavra}” não é função/setor nem equipe nomeada na Matriz`);
    }
    if (!['documentado', 'sugerido', 'manual'].includes(f.origem)) erros.push(`${f.id}: origem inválida`);
    if (!DATA_ISO.test(f.atualizado_em)) erros.push(`${f.id}: atualizado_em fora do formato AAAA-MM-DD`);
    if (f.fontes.length === 0) erros.push(`${f.id}: sem fontes`);
    for (const fonte of f.fontes) {
      if (!fonte.arquivo || !fonte.trecho?.trim()) erros.push(`${f.id}: fonte sem arquivo ou trecho`);
      else if (!existsSync(resolve(RAIZ, fonte.arquivo))) erros.push(`${f.id}: fonte "${fonte.arquivo}" não existe`);
    }
  }

  // Cobertura: uma ficha por ação da fase pedida (ou de todas).
  if (fase !== undefined && !doc.meta.fases_autoradas.includes(fase)) {
    erros.push(`Regra 4: a fase ${fase} ainda não foi autorada (fases autoradas: ${doc.meta.fases_autoradas.join(', ') || 'nenhuma'})`);
  }
  const exigidas = v08.acoes.filter((a) => fase === undefined || faseDoEstagio(a.estagio_id) === fase);
  const comFicha = new Set(acoes);
  const faltam = exigidas.filter((a) => !comFicha.has(a.id));
  if (faltam.length) erros.push(`Regra 4: ${faltam.length} ação(ões) sem ficha: ${faltam.slice(0, 8).map((a) => a.id).join(', ')}${faltam.length > 8 ? '…' : ''}`);

  // O arquivo tem que ser exatamente o que a autoria produz hoje.
  if (esperado && serializarFichas(esperado) !== serializarFichas(doc)) {
    erros.push('Regra 4: fichas_5w1h.json está desatualizado em relação a matriz_v08.json + fichas_autoria.json — rode `npm run dados:fichas`.');
  }
  return erros;
}

const lerJsonArquivo = <T>(caminho: string): T => JSON.parse(readFileSync(caminho, 'utf8')) as T;

/** `--v08`: valida a V08 gravada contra a V07, o mapa e o overlay. Devolve a linha final (OK ou os erros). */
function rodarV08(): number {
  for (const [caminho, dica] of [
    [JSON_V07, '`npm run dados:gerar`'],
    [JSON_V08, '`npm run dados:compor`'],
  ] as const) {
    if (!existsSync(caminho)) {
      console.log(`ERRO: ${caminho.slice(RAIZ.length + 1).replace(/\\/g, '/')} não existe — rode ${dica}.`);
      return 1;
    }
  }
  const v07 = lerJsonArquivo<Matriz>(JSON_V07);
  const v08 = lerJsonArquivo<MatrizV08>(JSON_V08);
  const mapa = lerJsonArquivo<MapaCondicionais>(JSON_MAPA);
  const esperado = compor(v07, lerJsonArquivo<AnotacoesV08>(JSON_ANOTACOES), mapa);
  const erros = [...validarV07(v07), ...validarV08(v08, v07, mapa, esperado)];
  if (erros.length) {
    erros.forEach((e) => console.log(`ERRO: ${e}`));
    return 1;
  }
  const novos = v08.acoes.filter((a) => a.origem_doc).length;
  console.log(`OK v08: setores=${v08.setores.length} estagios=${v08.estagios.length} celulas=${v08.acoes.length} if_else=${v08.condicionais.length} novos=${novos}`);
  return 0;
}

/** `--fichas [--fase=N]`: valida as fichas 5W1H gravadas contra a V08 e a autoria. */
function rodarFichas(fase?: number): number {
  for (const [caminho, dica] of [
    [JSON_V08, '`npm run dados:compor`'],
    [JSON_AUTORIA, 'a subetapa 02.2'],
    [JSON_FICHAS, '`npm run dados:fichas`'],
  ] as const) {
    if (!existsSync(caminho)) {
      console.log(`ERRO: ${caminho.slice(RAIZ.length + 1).replace(/\\/g, '/')} não existe — rode ${dica}.`);
      return 1;
    }
  }
  const v08 = lerJsonArquivo<MatrizV08>(JSON_V08);
  const autoria = lerJsonArquivo<Autoria>(JSON_AUTORIA);
  const doc = lerJsonArquivo<DocumentoFichas>(JSON_FICHAS);
  let esperado: DocumentoFichas | undefined;
  const erros: string[] = [];
  try {
    esperado = gerarFichas(v08, autoria, lerJsonArquivo<AnotacoesV08>(JSON_ANOTACOES));
  } catch (e) {
    erros.push((e as Error).message);
  }
  erros.push(...validarFichas(v08, doc, autoria, fase, esperado));
  if (erros.length) {
    erros.forEach((e) => console.log(`ERRO: ${e}`));
    return 1;
  }
  const exigidas = v08.acoes.filter((a) => fase === undefined || faseDoEstagio(a.estagio_id) === fase).length;
  console.log(`OK fichas${fase === undefined ? '' : ` fase ${fase}`}: ${exigidas}/${exigidas}`);
  return 0;
}

/** Sem flags: valida a V07 (planilha ↔ JSON ↔ MMO legado ↔ mapa). */
function rodarV07(): number {
  const erros: string[] = [];
  if (!existsSync(JSON_V07)) {
    console.log('ERRO: data/matriz_v07.json não existe — rode `npm run dados:gerar`.');
    return 1;
  }
  const m = lerJsonArquivo<Matriz>(JSON_V07);
  erros.push(...validarV07(m));
  erros.push(...validarMapa(m, lerJsonArquivo<MapaCondicionais>(resolve(RAIZ, 'data/conteudo/mapa_condicionais.json'))));
  // JSON em dia com a planilha (regra 8: planilha == JSON)
  if (serializar(lerMatriz()) !== readFileSync(JSON_V07, 'utf8').replace(/\r\n/g, '\n')) {
    erros.push('Regra 8: matriz_v07.json está desatualizado em relação à planilha — rode `npm run dados:gerar`.');
  }
  // Regra 8 — JSON == MMO_v01 legado
  const c = comparar(lerLegado(readFileSync(HTML_LEGADO, 'utf8')), lerJson(m));
  [...c.soNoLegado, ...c.soNoJson, ...c.contagemDiferente].forEach((x) => erros.push(`Regra 8: MMO_v01 diverge da V07 — ${x}`));

  if (erros.length) {
    erros.forEach((e) => console.log(`ERRO: ${e}`));
    return 1;
  }
  console.log(`OK v07: setores=${m.setores.length} estagios=${m.estagios.length} celulas=${m.acoes.length} if_else=${m.condicionais.length}`);
  return 0;
}

function principal(): number {
  const args = process.argv.slice(2);
  const pendentes: Record<string, [string, string]> = {
    '--bibliotecas': ['data/conteudo/documentos.json', 'subetapa 02.6'],
    '--pop': ['data/conteudo/perguntas_pop.json', 'subetapa 03.1'],
  };
  if (args.length === 0) return rodarV07();

  const argFase = args.find((a) => a.startsWith('--fase='));
  const fase = argFase === undefined ? undefined : Number(argFase.slice('--fase='.length));
  if (fase !== undefined && ![1, 2, 3, 4].includes(fase)) {
    console.log(`ERRO: ${argFase} inválido — use --fase=1, 2, 3 ou 4.`);
    return 1;
  }
  if (fase !== undefined && !args.includes('--fichas')) {
    console.log('ERRO: --fase só vale junto com --fichas.');
    return 1;
  }

  let codigo = 0;
  for (const a of args) {
    const flag = a.split('=')[0] ?? '';
    if (flag === '--v08') {
      codigo |= rodarV08();
      continue;
    }
    if (flag === '--fichas') {
      codigo |= rodarFichas(fase);
      continue;
    }
    if (flag === '--fase') continue; // parâmetro de --fichas
    const p = pendentes[flag];
    if (p && !existsSync(resolve(RAIZ, p[0]))) {
      console.log(`ERRO: ${a} indisponível — ${p[0]} ainda não existe (${p[1]}).`);
    } else {
      console.log(`ERRO: validação de ${a} ainda não implementada.`);
    }
    codigo = 1;
  }
  return codigo;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(principal());
