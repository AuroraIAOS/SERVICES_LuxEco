// Prova de fumaça do app publicado: abre #/mmo e #/fpe com SMOKE_BASIC_* num Chromium real, sem erros de console,
// com a fonte da marca carregada e sem exibir credenciais. Uso: npx tsx scripts/smoke_remoto.ts
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { lerEnv } from './deploy_lib.ts';

const env = lerEnv(readFileSync(join(resolve(import.meta.dirname, '..'), '.env'), 'utf8'));
const navegador = await chromium.launch();
const contexto = await navegador.newContext({ httpCredentials: { username: env.SMOKE_BASIC_USER as string, password: env.SMOKE_BASIC_PASS as string } });
const page = await contexto.newPage();
const erros: string[] = [];
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
page.on('pageerror', (e) => erros.push(String(e)));
page.on('response', (r) => r.status() >= 400 && erros.push(`${r.status()} ${new URL(r.url()).pathname}`));

let ok = true;
const confere = (nome: string, cond: boolean) => {
  console.log(`${cond ? 'ok  ' : 'FALHA'} ${nome}`);
  ok &&= cond;
};
const base = env.APP_URL as string;
await page.goto(`${base}#/mmo`);
await page.getByRole('heading', { level: 1, name: 'MMO' }).waitFor({ timeout: 15000 });
confere('MMO abre', true);
await page.goto(`${base}#/fpe`);
await page.getByRole('heading', { level: 2, name: 'Ficha 5W1H' }).waitFor({ timeout: 15000 });
confere('FPE abre com a ficha', true);
confere('236 fichas no resumo', ((await page.getByRole('list', { name: 'Resumo' }).textContent()) ?? '').includes('236 fichas'));
confere('fonte da marca carregada', await page.evaluate(async () => (await document.fonts.ready, [...document.fonts].some((f) => f.family.includes('Cyntho') && f.status === 'loaded'))));
confere('sem erros de console nem respostas 4xx/5xx', erros.length === 0);
if (erros.length) console.log(erros.join('\n'));
await page.screenshot({ path: 'screenshots/remoto_fpe.png' });
await navegador.close();
process.exit(ok ? 0 : 1);
