// Regras de integridade de docs/02_MODELO_DE_DADOS.md. Ativas: 1, 2, 8 (01.4), 3 — V08 (02.1), 4–5 — fichas (02.2–02.5),
// 6–7 — bibliotecas (02.6), + integridade referencial e mapa de condicionais. Falta só o POP (`--pop`, 03.1).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Condicional, Documento, Ferramenta, Investimento, Kpi, Matriz, MatrizV08 } from '../src/dados/tipos.ts';
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

export interface Bibliotecas {
  documentos: Documento[];
  ferramentas: Ferramenta[];
  investimentos: Investimento[];
  kpis: Kpi[];
}

/** Documentos que docs/06 §4 (6.d) e as fontes citam: cada padrão tem de casar com ≥ 1 documento `documentado`. */
const DOCUMENTOS_OBRIGATORIOS: [string, RegExp][] = [
  ['conta de energia do cliente', /conta de energia/i],
  ['simulação de consumo', /simulação de consumo/i],
  ['proposta comercial', /proposta comercial/i],
  ['contrato (digital)', /contrato digital/i],
  ['ordem de compra (OC)', /ordem de compra/i],
  ['guias de translado', /guias de translado/i],
  ['projeto técnico', /projeto técnico/i],
  ['CAT', /^CAT$/],
  ['laudo de vistoria', /laudo de vistoria/i],
  ['comprovante de treinamento', /comprovante de treinamento/i],
  ['pedido de ligação/homologação', /pedido de ligação/i],
  ['parecer de inviabilidade', /parecer de inviabilidade/i],
  ['parecer da Cemig com ajustes', /parecer da cemig/i],
];
/** Ferramentas documentadas (docs/06 §4, 6.e). */
const FERRAMENTAS_OBRIGATORIAS: [string, RegExp][] = [
  ['WhatsApp (Grupo de Fluxo)', /whatsapp/i],
  ['Google Ads', /google ads/i],
  ['plataformas financeiras parceiras', /plataformas financeiras/i],
  ['plataforma de cartão (até 21x)', /cartão/i],
  ['CRM próprio (futuro)', /crm próprio/i],
];
const CAMPOS_FORMULARIO_KPI = ['indicador', 'periodo', 'meta', 'realizado', 'responsavel', 'observacoes'];
const ORIGENS = ['documentado', 'sugerido', 'manual'];
const NOME_MAX = 60;
const FORMULA_MAX = 160;

/**
 * Regras 6 e 7 (docs/02) + integridade das bibliotecas (docs/06 §4): investimentos só categorias (`valor_estimado_brl` null),
 * KPIs sem meta, ≥ 1 KPI de produtividade e ≥ 1 de eficiência por setor (12), documentado com fonte, sugerido com justificativa.
 */
export function validarBibliotecas(v08: MatrizV08, b: Bibliotecas): string[] {
  const erros: string[] = [];
  const setores = new Set(v08.setores.map((s) => s.id));
  const estagios = new Set(v08.estagios.map((e) => e.id));
  const unicos = (nome: string, padrao: RegExp, ids: string[]) => {
    const d = duplicados(ids);
    if (d.length) erros.push(`${nome}: ids duplicados: ${[...new Set(d)].join(', ')}`);
    for (const id of ids) if (!padrao.test(id)) erros.push(`${nome}: id "${id}" fora do padrão`);
  };
  unicos('documentos', /^doc_\d{2,}$/, b.documentos.map((d) => d.id));
  unicos('ferramentas', /^fer_\d{2,}$/, b.ferramentas.map((d) => d.id));
  unicos('investimentos', /^inv_\d{2,}$/, b.investimentos.map((d) => d.id));
  unicos('kpis', /^kpi_\d{2}_\d+$/, b.kpis.map((d) => d.id));

  const texto = (rotulo: string, valor: string | undefined, obrigatorio = true) => {
    if (valor === undefined || !valor.trim()) {
      if (obrigatorio) erros.push(`${rotulo}: vazio`);
      return;
    }
    if (traz_cifra_ou_prazo(valor)) erros.push(`Conteúdo: ${rotulo} traz cifra em R$ ou prazo numérico ("${valor}")`);
  };
  const origemEFontes = (id: string, x: { origem: string; fontes?: { arquivo: string; trecho: string }[]; justificativa?: string }) => {
    if (!ORIGENS.includes(x.origem)) erros.push(`${id}: origem inválida`);
    if (x.origem === 'documentado') {
      if (!x.fontes?.length) erros.push(`${id}: documentado sem fontes`);
      for (const f of x.fontes ?? []) {
        if (!f.arquivo || !f.trecho?.trim()) erros.push(`${id}: fonte sem arquivo ou trecho`);
        else if (!existsSync(resolve(RAIZ, f.arquivo))) erros.push(`${id}: fonte "${f.arquivo}" não existe`);
      }
    }
    if (x.origem === 'sugerido' && !x.justificativa?.trim()) erros.push(`${id}: sugerido sem justificativa`);
    texto(`${id}.justificativa`, x.justificativa, false);
  };
  const refs = (id: string, setoresIds: string[], estagioIds?: number[]) => {
    if (setoresIds.length === 0) erros.push(`${id}: sem setor_ids`);
    for (const s of setoresIds) if (!setores.has(s)) erros.push(`${id}: setor "${s}" inexistente`);
    if (estagioIds) {
      if (estagioIds.length === 0) erros.push(`${id}: sem estagio_ids`);
      for (const e of estagioIds) if (!estagios.has(e)) erros.push(`${id}: estágio ${e} inexistente`);
    }
  };

  for (const d of b.documentos) {
    if (!d.nome?.trim() || d.nome.length > NOME_MAX) erros.push(`${d.id}: nome vazio ou acima de ${NOME_MAX} caracteres`);
    texto(`${d.id}.nome`, d.nome);
    refs(d.id, d.setor_ids, d.estagio_ids);
    origemEFontes(d.id, d);
  }
  for (const [rotulo, re] of DOCUMENTOS_OBRIGATORIOS) {
    if (!b.documentos.some((d) => d.origem === 'documentado' && re.test(d.nome))) erros.push(`documentos: falta o documento documentado “${rotulo}” (docs/06 §4)`);
  }

  for (const f of b.ferramentas) {
    if (!f.nome?.trim() || f.nome.length > NOME_MAX) erros.push(`${f.id}: nome vazio ou acima de ${NOME_MAX} caracteres`);
    texto(`${f.id}.nome`, f.nome);
    texto(`${f.id}.observacao`, f.observacao, false);
    if (!['em_uso', 'temporaria', 'futura'].includes(f.situacao)) erros.push(`${f.id}: situacao inválida`);
    if (/crm próprio/i.test(f.nome) && f.situacao !== 'futura') erros.push(`${f.id}: o CRM próprio é futuro e fora do escopo (situacao deve ser "futura")`);
    refs(f.id, f.setor_ids, f.estagio_ids);
    origemEFontes(f.id, f);
  }
  for (const [rotulo, re] of FERRAMENTAS_OBRIGATORIAS) {
    if (!b.ferramentas.some((f) => f.origem === 'documentado' && re.test(f.nome))) erros.push(`ferramentas: falta a ferramenta documentada “${rotulo}” (docs/06 §4)`);
  }

  // Regra 6 — investimentos só categorias, sem cifra.
  for (const i of b.investimentos) {
    if (i.valor_estimado_brl !== null) erros.push(`Regra 6: ${i.id} com valor_estimado_brl diferente de null (proibido inventar cifra em R$)`);
    if (!i.categoria?.trim() || i.categoria.length > NOME_MAX) erros.push(`${i.id}: categoria vazia ou acima de ${NOME_MAX} caracteres`);
    texto(`${i.id}.categoria`, i.categoria);
    texto(`${i.id}.descricao`, i.descricao);
    refs(i.id, i.setor_ids);
    origemEFontes(i.id, i);
  }
  if (b.investimentos.length === 0) erros.push('investimentos: biblioteca vazia');

  // Regras 6 e 7 — KPIs sem meta; ≥ 1 de produtividade e ≥ 1 de eficiência por setor.
  for (const k of b.kpis) {
    if (k.meta !== null) erros.push(`Regra 6: ${k.id} com meta diferente de null (a meta é da Lux)`);
    if (!['produtividade', 'eficiencia'].includes(k.tipo)) erros.push(`${k.id}: tipo inválido`);
    if (!k.nome?.trim() || k.nome.length > NOME_MAX) erros.push(`${k.id}: nome vazio ou acima de ${NOME_MAX} caracteres`);
    if (!k.formula_descricao?.trim() || k.formula_descricao.includes('\n') || k.formula_descricao.length > FORMULA_MAX) {
      erros.push(`${k.id}: fórmula vazia, com quebra de linha ou acima de ${FORMULA_MAX} caracteres (uma linha)`);
    }
    texto(`${k.id}.nome`, k.nome);
    texto(`${k.id}.formula_descricao`, k.formula_descricao);
    texto(`${k.id}.fundamento`, k.fundamento);
    if (!setores.has(k.setor_id)) erros.push(`${k.id}: setor "${k.setor_id}" inexistente`);
    if (CAMPOS_FORMULARIO_KPI.some((c) => !(k.formulario as string[]).includes(c))) erros.push(`${k.id}: formulário sem algum dos campos ${CAMPOS_FORMULARIO_KPI.join(', ')}`);
    if (!ORIGENS.includes(k.origem)) erros.push(`${k.id}: origem inválida`);
    if (['setor_11', 'setor_12'].includes(k.setor_id) && !k.acompanhamento) erros.push(`${k.id}: KPI de Cemig/Cliente deve ser marcado como indicador de acompanhamento`);
  }
  for (const s of v08.setores) {
    for (const tipo of ['produtividade', 'eficiencia'] as const) {
      if (!b.kpis.some((k) => k.setor_id === s.id && k.tipo === tipo)) erros.push(`Regra 7: o setor ${s.nome} (${s.id}) não tem KPI de ${tipo}`);
    }
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

/** `--bibliotecas`: valida documentos, ferramentas, investimentos e KPIs (regras 6 e 7). */
function rodarBibliotecas(): number {
  const arquivos = {
    documentos: resolve(RAIZ, 'data/conteudo/documentos.json'),
    ferramentas: resolve(RAIZ, 'data/conteudo/ferramentas.json'),
    investimentos: resolve(RAIZ, 'data/conteudo/investimentos.json'),
    kpis: resolve(RAIZ, 'data/conteudo/kpis.json'),
  };
  for (const c of [JSON_V08, ...Object.values(arquivos)]) {
    if (!existsSync(c)) {
      console.log(`ERRO: ${c.slice(RAIZ.length + 1).replace(/\\/g, '/')} não existe (subetapa 02.6).`);
      return 1;
    }
  }
  const v08 = lerJsonArquivo<MatrizV08>(JSON_V08);
  const b: Bibliotecas = {
    documentos: lerJsonArquivo<{ documentos: Documento[] }>(arquivos.documentos).documentos,
    ferramentas: lerJsonArquivo<{ ferramentas: Ferramenta[] }>(arquivos.ferramentas).ferramentas,
    investimentos: lerJsonArquivo<{ investimentos: Investimento[] }>(arquivos.investimentos).investimentos,
    kpis: lerJsonArquivo<{ kpis: Kpi[] }>(arquivos.kpis).kpis,
  };
  const erros = validarBibliotecas(v08, b);
  if (erros.length) {
    erros.forEach((e) => console.log(`ERRO: ${e}`));
    return 1;
  }
  const prod = b.kpis.filter((k) => k.tipo === 'produtividade').length;
  const efic = b.kpis.filter((k) => k.tipo === 'eficiencia').length;
  const valores = b.investimentos.filter((i) => i.valor_estimado_brl !== null).length + b.kpis.filter((k) => k.meta !== null).length;
  const sugeridos = [...b.documentos, ...b.ferramentas, ...b.investimentos, ...b.kpis].filter((x) => x.origem === 'sugerido').length;
  console.log(
    `bibliotecas: documentos=${b.documentos.length} ferramentas=${b.ferramentas.length} investimentos=${b.investimentos.length} ` +
      `kpis=${b.kpis.length} (produtividade=${prod}, eficiencia=${efic}) sugeridos=${sugeridos}`,
  );
  // A linha final afirma o piso verificado pela regra 7 (≥ 1 KPI de cada tipo em cada um dos 12 setores).
  console.log(`OK bibliotecas: setores=${v08.setores.length} kpis_produtividade>=${v08.setores.length} kpis_eficiencia>=${v08.setores.length} valores_brl=${valores}`);
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
    if (flag === '--bibliotecas') {
      codigo |= rodarBibliotecas();
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
