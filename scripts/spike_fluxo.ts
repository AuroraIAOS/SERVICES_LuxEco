// Spike 01.5 — Mermaid × SVG de raias: mede a largura real de cada diagrama no Chromium (Playwright).
// Critérios do plano: setor ≤ 2600 px · fase ≤ 3200 px. Impressão A3 paisagem: fonte efetiva ≥ 8 pt.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { mermaidFase, mermaidSetor } from '../src/fluxograma/mermaid.ts';
import type { Matriz } from '../src/dados/tipos.ts';
import { lerMatriz } from './xlsx_para_json.ts';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../..');
const LIMITE_SETOR = 2600;
const LIMITE_FASE = 3200;
// A3 paisagem = 420 mm; margens de 10 mm → 400 mm úteis a 96 dpi.
const LARGURA_A3_PX = Math.round((400 / 25.4) * 96);
const FONTE_MERMAID_PX = 16; // padrão do Mermaid
const pt = (px: number) => px * 0.75;
const ALTURA_A3_PX = Math.round((277 / 25.4) * 96);

interface Medida {
  rotulo: string;
  tipo: 'setor' | 'fase';
  largura: number;
  altura: number;
  erro?: string;
}

// raias.ts só existe se o Mermaid reprovar (plano 01.5 passo 4): o import é opcional.
async function carregarRaias(): Promise<null | { FONTE_PX: number; raiasSetor: (m: Matriz, id: string) => string; raiasFase: (m: Matriz, id: number) => string }> {
  try {
    return await import('../src/fluxograma/raias.ts');
  } catch {
    return null;
  }
}

async function principal(): Promise<number> {
  const m = lerMatriz();
  const raias = await carregarRaias();
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  await pagina.setContent('<!doctype html><html><body><div id="x"></div></body></html>');
  await pagina.addScriptTag({ content: readFileSync(resolve(RAIZ, 'node_modules/mermaid/dist/mermaid.min.js'), 'utf8') });
  await pagina.evaluate(() => {
    const w = window as unknown as { mermaid: { initialize: (c: unknown) => void } };
    w.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', flowchart: { useMaxWidth: false } });
  });

  const medirMermaid = async (id: string, codigo: string) =>
    pagina.evaluate(
      async ({ id, codigo }) => {
        const w = window as unknown as { mermaid: { render: (i: string, c: string) => Promise<{ svg: string }> } };
        try {
          const { svg } = await w.mermaid.render(id, codigo);
          const host = document.getElementById('x');
          if (!host) throw new Error('#x ausente');
          host.innerHTML = svg;
          const el = host.querySelector('svg');
          const vb = el?.viewBox.baseVal;
          return { largura: Math.round(vb?.width ?? 0), altura: Math.round(vb?.height ?? 0) };
        } catch (e) {
          return { largura: 0, altura: 0, erro: String(e) };
        }
      },
      { id, codigo },
    );

  const medirSvg = async (svg: string) =>
    pagina.evaluate((svg) => {
      const host = document.getElementById('x');
      if (!host) throw new Error('#x ausente');
      host.innerHTML = svg;
      const el = host.querySelector('svg');
      const b = el?.getBoundingClientRect();
      return { largura: Math.round(b?.width ?? 0), altura: Math.round(b?.height ?? 0) };
    }, svg);

  const mer: Medida[] = [];
  const rai: Medida[] = [];
  for (const s of m.setores) {
    mer.push({ rotulo: s.nome, tipo: 'setor', ...(await medirMermaid(`m_${s.id}`, mermaidSetor(m, s.id))) });
    if (raias) rai.push({ rotulo: s.nome, tipo: 'setor', ...(await medirSvg(raias.raiasSetor(m, s.id))) });
  }
  for (const f of m.fases) {
    mer.push({ rotulo: `Fase ${f.id} ${f.nome}`, tipo: 'fase', ...(await medirMermaid(`m_f${f.id}`, mermaidFase(m, f.id))) });
    if (raias) rai.push({ rotulo: `Fase ${f.id} ${f.nome}`, tipo: 'fase', ...(await medirSvg(raias.raiasFase(m, f.id))) });
  }
  await navegador.close();

  const limite = (x: Medida) => (x.tipo === 'setor' ? LIMITE_SETOR : LIMITE_FASE);
  const linha = (x: Medida, fontePx: number) => {
    const escala = LARGURA_A3_PX / Math.max(x.largura, LARGURA_A3_PX);
    const okLarg = !x.erro && x.largura > 0 && x.largura <= limite(x) && pt(fontePx) * (LARGURA_A3_PX / Math.max(x.largura, LARGURA_A3_PX)) >= 8;
    const fonteImpressa = pt(fontePx) * escala;
    return {
      ok: okLarg,
      texto:
        `  ${okLarg ? 'ok   ' : 'FALHA'} ${x.rotulo.padEnd(34)} ${String(x.largura).padStart(6)} px × ${String(x.altura).padStart(5)} px` +
        `  (limite ${limite(x)})  A3: escala ${escala.toFixed(2)} → fonte ${fonteImpressa.toFixed(1)} pt, ${Math.max(1, Math.ceil((x.altura * escala) / ALTURA_A3_PX))} pág.` +
        (x.erro ? `  ERRO: ${x.erro.slice(0, 80)}` : ''),
    };
  };
  const relatorio = (nome: string, medidas: Medida[], fontePx: number) => {
    console.log(`\n${nome}:`);
    const ls = medidas.map((x) => linha(x, fontePx));
    ls.forEach((l) => console.log(l.texto));
    const falhas = ls.filter((l) => !l.ok).length;
    console.log(`  → ${medidas.length - falhas}/${medidas.length} dentro do limite de largura`);
    return falhas === 0;
  };
  const mermaidOk = relatorio('MERMAID (flowchart LR)', mer, FONTE_MERMAID_PX);
  const raiasOk = raias ? relatorio('SVG DE RAIAS (próprio)', rai, raias.FONTE_PX) : false;

  console.log(`\nLargura útil A3 paisagem: ${LARGURA_A3_PX} px. Mermaid: máx ${Math.max(...mer.map((x) => x.largura))} px; raias: ${raias ? `máx ${Math.max(...rai.map((x) => x.largura))} px` : 'ainda não implementado'}.`);
  const decisao = mermaidOk ? 'mermaid' : raiasOk ? 'raias_svg' : 'nenhum';
  console.log(`DECISAO: ${decisao}`);
  return decisao === 'nenhum' ? 1 : 0;
}

principal().then((c) => process.exit(c), (e) => {
  console.error(e);
  process.exit(2);
});
