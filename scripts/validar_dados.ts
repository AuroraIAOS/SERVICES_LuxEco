// Regras de integridade de docs/02_MODELO_DE_DADOS.md. Ativas na 01.4: 1, 2, 8 (+ integridade referencial e mapa de condicionais).
// As regras de V08 (3), fichas (4–5) e bibliotecas (6–7) ficam inativas até existirem os arquivos delas.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Matriz } from '../src/dados/tipos.ts';
import { comparar, HTML_LEGADO, lerJson, lerLegado } from './comparar_mmo_legado.ts';
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

/** Regras 1 e 2 + integridade referencial da V07. Devolve a lista de erros (vazia = ok). */
export function validarV07(m: Matriz): string[] {
  const erros: string[] = [];
  // Regra 1 — 12 setores, 22 estágios, ids únicos
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
  // Regra 2 — V07: 212 células e 31 IF/ELSE
  if (m.acoes.length !== ESPERADO_V07.celulas) erros.push(`Regra 2: esperadas ${ESPERADO_V07.celulas} células, achou ${m.acoes.length}`);
  const ifElse = m.acoes.filter((a) => a.e_condicional).length;
  if (ifElse !== ESPERADO_V07.if_else) erros.push(`Regra 2: esperados ${ESPERADO_V07.if_else} IF/ELSE, achou ${ifElse}`);
  if (m.condicionais.length !== ifElse) erros.push(`Regra 2: ${m.condicionais.length} condicionais para ${ifElse} ações IF/ELSE`);

  // Integridade referencial
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

const lerJsonArquivo = <T>(caminho: string): T => JSON.parse(readFileSync(caminho, 'utf8')) as T;

function principal(): number {
  const args = process.argv.slice(2);
  const pendentes: Record<string, [string, string]> = {
    '--v08': ['data/matriz_v08.json', 'subetapa 02.1'],
    '--fichas': ['data/conteudo/fichas_5w1h.json', 'subetapas 02.2–02.5'],
    '--bibliotecas': ['data/conteudo/documentos.json', 'subetapa 02.6'],
    '--pop': ['data/conteudo/perguntas_pop.json', 'subetapa 03.1'],
  };
  for (const a of args) {
    const p = pendentes[a.split('=')[0] ?? ''];
    if (p && !existsSync(resolve(RAIZ, p[0]))) {
      console.log(`ERRO: ${a} indisponível — ${p[0]} ainda não existe (${p[1]}).`);
      return 1;
    }
  }
  if (args.length) {
    console.log(`ERRO: validação de ${args.join(' ')} ainda não implementada.`);
    return 1;
  }

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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(principal());
