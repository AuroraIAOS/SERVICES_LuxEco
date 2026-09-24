#!/usr/bin/env node
// Gera src/estilos/tokens.css a partir de design/tokens.json (fonte única das cores da marca).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const t = JSON.parse(readFileSync(resolve(raiz, 'design/tokens.json'), 'utf8'));

const linhas = [
  '/* GERADO por scripts/gerar_tokens.mjs a partir de design/tokens.json — não edite à mão. */',
  ':root {',
  ...Object.entries(t.cores).map(([k, v]) => `  --${k}: ${v};`),
  ...Object.entries(t.setores).map(([k, v]) => `  --setor-${k}: ${v};`),
  `  --fonte-familia: '${t.tipografia.familia}', ${t.tipografia.fallback};`,
  `  --peso-corpo: ${t.tipografia['peso-corpo']};`,
  `  --peso-titulo: ${t.tipografia['peso-titulo']};`,
  `  --tamanho-corpo-min: ${t.tipografia['tamanho-corpo-min']};`,
  '}',
  '',
];
const saida = resolve(raiz, 'src/estilos/tokens.css');
mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, linhas.join('\n'));
console.log(`OK tokens: cores=${Object.keys(t.cores).length} setores=${Object.keys(t.setores).length} -> src/estilos/tokens.css`);
