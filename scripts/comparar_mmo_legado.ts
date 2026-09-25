// Compara a presença setor × estágio (e a contagem de ações) do MMO_v01 legado com a Matriz V07 em JSON.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Matriz } from '../src/dados/tipos.ts';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
export const HTML_LEGADO = resolve(RAIZ, 'data/fontes/legado/MMO_v01.html');

const semTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();

/** "estagio|setor" → nº de ações (li) daquele setor naquele estágio, como o MMO_v01 mostra. */
export function lerLegado(html: string): Map<string, number> {
  const saida = new Map<string, number>();
  const pilulas = html.split('<div class="stage-pill"').slice(1);
  for (const p of pilulas) {
    const num = /<span class="stage-num">(\d+)<\/span>/.exec(p)?.[1];
    if (!num) throw new Error('MMO_v01: pílula sem número de estágio');
    const blocos = p.split('<div class="stage-sector-block">').slice(1);
    for (const b of blocos) {
      const setor = /<div class="stage-sector-label"[^>]*>(.*?)<\/div>/.exec(b)?.[1];
      if (!setor) throw new Error(`MMO_v01: bloco sem rótulo de setor no estágio ${num}`);
      const acoes = (b.match(/<li class="stage-action-item"/g) ?? []).length;
      saida.set(`${Number(num)}|${semTags(setor)}`, acoes);
    }
  }
  return saida;
}

export function lerJson(matriz: Matriz): Map<string, number> {
  const nomePorId = new Map(matriz.setores.map((s) => [s.id, s.nome]));
  const saida = new Map<string, number>();
  for (const a of matriz.acoes) {
    const k = `${a.estagio_id}|${nomePorId.get(a.setor_id)}`;
    saida.set(k, (saida.get(k) ?? 0) + 1);
  }
  return saida;
}

export interface Comparacao {
  soNoLegado: string[];
  soNoJson: string[];
  contagemDiferente: string[];
}

export function comparar(legado: Map<string, number>, json: Map<string, number>): Comparacao {
  const soNoLegado = [...legado.keys()].filter((k) => !json.has(k)).sort();
  const soNoJson = [...json.keys()].filter((k) => !legado.has(k)).sort();
  const contagemDiferente = [...legado.keys()]
    .filter((k) => json.has(k) && json.get(k) !== legado.get(k))
    .map((k) => `${k} legado=${legado.get(k)} json=${json.get(k)}`)
    .sort();
  return { soNoLegado, soNoJson, contagemDiferente };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const matriz = JSON.parse(readFileSync(resolve(RAIZ, 'data/matriz_v07.json'), 'utf8')) as Matriz;
  const c = comparar(lerLegado(readFileSync(HTML_LEGADO, 'utf8')), lerJson(matriz));
  c.soNoLegado.forEach((k) => console.log(`DIVERGE presença: só no MMO_v01 → ${k}`));
  c.soNoJson.forEach((k) => console.log(`DIVERGE presença: só na Matriz V07 → ${k}`));
  c.contagemDiferente.forEach((k) => console.log(`DIVERGE contagem de ações: ${k}`));
  const ok = !c.soNoLegado.length && !c.soNoJson.length && !c.contagemDiferente.length;
  console.log(ok ? 'OK: MMO_v01 == Matriz V07' : 'FALHA: MMO_v01 != Matriz V07');
  process.exit(ok ? 0 : 1);
}
