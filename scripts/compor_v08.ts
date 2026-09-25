// matriz_v07.json + anotacoes_v08.json (+ mapa_condicionais.json) → data/matriz_v08.json.
// Overlay puro: acrescenta células novas ao fim de cada par setor × estágio e preenche `situacao_id` das
// condicionais da V07 a partir do mapa das 15 situações. Nada da V07 é renomeado, removido ou reescrito.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Acao,
  ClassificacaoLead,
  Condicional,
  Matriz,
  MatrizV08,
  Oportunidade,
  PerfilCliente,
  RamoCondicional,
  RespostaPadrao,
} from '../src/dados/tipos.ts';
import type { MapaCondicionais } from './validar_dados.ts';
import { JSON_V07, serializar } from './xlsx_para_json.ts';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
export const JSON_ANOTACOES = resolve(RAIZ, 'data/conteudo/anotacoes_v08.json');
export const JSON_MAPA = resolve(RAIZ, 'data/conteudo/mapa_condicionais.json');
export const JSON_V08 = resolve(RAIZ, 'data/matriz_v08.json');

/** Célula que a V08 acrescenta. Com `se_sim`/`se_nao` vira ação IF/ELSE + condicional. */
export interface CelulaNova {
  setor_id: string;
  estagio_id: number;
  texto: string;
  se_sim?: RamoCondicional;
  se_nao?: RamoCondicional;
  fonte_secao: string;
}

export interface AnotacoesV08 {
  meta: { fonte: string; origem_doc: string; regra: string; decisoes: string[] };
  celulas_novas: CelulaNova[];
  perfis_cliente: PerfilCliente[];
  classificacao_lead: ClassificacaoLead[];
  oportunidades: Oportunidade[];
  respostas_padrao: RespostaPadrao[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const numeroSetor = (setorId: string) => setorId.replace(/^setor_/, '');

/** Aplica o overlay. Erros de entrada (setor/estágio inexistente, ramo pela metade) falham com mensagem clara. */
export function compor(v07: Matriz, overlay: AnotacoesV08, mapa: MapaCondicionais): MatrizV08 {
  const m = structuredClone(v07);
  const setores = new Set(m.setores.map((s) => s.id));
  const estagios = new Set(m.estagios.map((e) => e.id));
  const situacaoDaCondicional = new Map<string, string>();
  for (const s of mapa.situacoes) {
    for (const id of s.condicionais_ids) situacaoDaCondicional.set(id, s.id);
    for (const p of s.participantes) situacaoDaCondicional.set(p.condicional_id, s.id);
  }

  // 1) situacao_id das condicionais da V07 (campo previsto em docs/02; só preenche, não altera o resto).
  const condicionais: Condicional[] = m.condicionais.map((c) => {
    const sit = situacaoDaCondicional.get(c.id);
    return sit ? { ...c, situacao_id: sit } : c;
  });

  // 2) células novas, ao fim de cada par setor × estágio.
  const proximaOrdem = new Map<string, number>();
  for (const a of m.acoes) {
    const k = `${a.setor_id}|${a.estagio_id}`;
    proximaOrdem.set(k, Math.max(proximaOrdem.get(k) ?? 0, a.ordem));
  }
  const acoes: Acao[] = [...m.acoes];
  let n = 0;
  for (const c of overlay.celulas_novas) {
    const ref = `celulas_novas[${n}] (${c.setor_id}, est. ${c.estagio_id})`;
    if (!setores.has(c.setor_id)) throw new Error(`${ref}: setor_id inexistente`);
    if (!estagios.has(c.estagio_id)) throw new Error(`${ref}: estagio_id inexistente`);
    if (!c.texto.trim()) throw new Error(`${ref}: texto vazio`);
    if (!c.fonte_secao.trim()) throw new Error(`${ref}: sem fonte_secao (rastreabilidade)`);
    if (Boolean(c.se_sim) !== Boolean(c.se_nao)) throw new Error(`${ref}: IF/ELSE precisa dos dois ramos`);
    n += 1;
    const chave = `${c.setor_id}|${c.estagio_id}`;
    const ordem = (proximaOrdem.get(chave) ?? 0) + 1;
    proximaOrdem.set(chave, ordem);
    const sufixo = `${numeroSetor(c.setor_id)}_${pad2(c.estagio_id)}_${ordem}`;
    acoes.push({
      id: `acao_${sufixo}`,
      setor_id: c.setor_id,
      estagio_id: c.estagio_id,
      ordem,
      texto: c.texto,
      e_condicional: Boolean(c.se_sim),
      celula: `V08-${String(n).padStart(3, '0')}`,
      origem_doc: overlay.meta.origem_doc,
    });
    if (c.se_sim && c.se_nao) {
      condicionais.push({ id: `cond_${sufixo}`, acao_id: `acao_${sufixo}`, pergunta: c.texto, se_sim: c.se_sim, se_nao: c.se_nao });
    }
  }

  return {
    meta: {
      ...m.meta,
      versao_matriz: 'V08',
      base_v07: 'data/matriz_v07.json',
      overlay: 'data/conteudo/anotacoes_v08.json',
      origem_doc: overlay.meta.origem_doc,
    },
    fases: m.fases,
    setores: m.setores,
    estagios: m.estagios,
    acoes,
    condicionais,
    perfis_cliente: overlay.perfis_cliente,
    classificacao_lead: overlay.classificacao_lead,
    oportunidades: overlay.oportunidades,
    respostas_padrao: overlay.respostas_padrao,
  };
}

const lerJson = <T>(caminho: string): T => JSON.parse(readFileSync(caminho, 'utf8')) as T;

/** Lê os três insumos versionados e devolve a V08 composta (sem escrever). */
export function comporDosArquivos(): MatrizV08 {
  return compor(lerJson<Matriz>(JSON_V07), lerJson<AnotacoesV08>(JSON_ANOTACOES), lerJson<MapaCondicionais>(JSON_MAPA));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const v08 = comporDosArquivos();
  writeFileSync(JSON_V08, serializar(v08), 'utf8');
  const novos = v08.acoes.filter((a) => a.origem_doc).length;
  console.log(
    `OK composto data/matriz_v08.json: setores=${v08.setores.length} estagios=${v08.estagios.length} ` +
      `celulas=${v08.acoes.length} if_else=${v08.condicionais.length} novos=${novos}`,
  );
}
