import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// A versão de arquivo único (`npm run build:single`), aberta DO DISCO (file://), sem servidor e sem internet: é o que a pessoa leva
// no pendrive. Tudo o que não depende do servidor tem de funcionar; o que depende (IA, versões) desativa com explicação.
const ARQUIVO = resolve(import.meta.dirname, '../dist-single/index.html');
const url = (rota: string) => `${pathToFileURL(ARQUIVO).href}#${rota}`;

test.beforeAll(() => {
  execSync('npm run build:single', { cwd: resolve(import.meta.dirname, '..'), stdio: 'ignore' });
});

async function abrir(page: Page, rota: string) {
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));
  page.on('requestfailed', (r) => erros.push(`falhou: ${r.url().slice(0, 80)}`));
  await page.goto(url(rota));
  return erros;
}

test('offline: MMO, FPE e POP abrem do disco, sem erro e sem pedir nada à rede', async ({ page }) => {
  const pedidos: string[] = [];
  page.on('request', (r) => !r.url().startsWith('file:') && !r.url().startsWith('data:') && pedidos.push(r.url()));
  const erros = await abrir(page, '/mmo');
  await expect(page.getByRole('heading', { level: 1, name: 'MMO v02' })).toBeVisible();
  await page.getByRole('link', { name: 'FPE', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('236 fichas');
  await page.getByRole('link', { name: 'POP', exact: true }).click();
  await page.getByRole('button', { name: 'Gerar POP geral' }).click();
  await expect(page.getByRole('article', { name: 'POP geral — Lux Eco Solutions' })).toBeVisible();
  expect(await page.evaluate(async () => (await document.fonts.ready, [...document.fonts].some((f) => f.family.includes('Cyntho') && f.status === 'loaded')))).toBe(true);
  expect(pedidos).toEqual([]);
  expect(erros).toEqual([]);
});

test('offline: sem IA (painéis e botões somem) e sem chave no arquivo', async ({ page }) => {
  await abrir(page, '/pop');
  await expect(page.getByRole('heading', { level: 1, name: 'POP' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Redigir com IA/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Redação com IA|Limite de gasto da IA/ })).toHaveCount(0);
  const html = readFileSync(ARQUIVO, 'utf8');
  expect(html).not.toMatch(/\bsk-(?:or|ant|proj)[\w-]{6,}/);
  expect(html).not.toMatch(/HOSTGATOR_FTP|SMOKE_BASIC/);
});

test('offline: “Salvar versão” desativado com explicação; “Baixar arquivo” gera o .html; a tela Versões diz o que houve', async ({ page }) => {
  const erros = await abrir(page, '/fpe');
  await expect(page.getByText(/O servidor de versões não está disponível aqui/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar versão' })).toBeDisabled();
  const [arquivo] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar arquivo' }).click()]);
  expect(arquivo.suggestedFilename()).toMatch(/^versao_fpe_\d{4}-\d{2}-\d{2}_\d{4}\.html$/);
  expect(readFileSync(await arquivo.path(), 'utf8')).toContain('id="lux-estado"');

  await page.getByRole('link', { name: 'Versões salvas' }).first().click();
  await expect(page.getByRole('heading', { level: 2, name: 'Não foi possível carregar as versões' })).toBeVisible();
  await expect(page.getByText(/nada foi perdido/)).toBeVisible();
  expect(erros).toEqual([]);
});

test('offline: exportações que rodam no navegador continuam (Excel e Word)', async ({ page }) => {
  await abrir(page, '/pop');
  await page.getByRole('button', { name: 'Gerar POP do setor Marketing' }).click();
  const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Exportar planilha .* em Excel/ }).click()]);
  expect(xlsx.suggestedFilename()).toMatch(/^lux_fpe-pop_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const [docx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Exportar POP — Marketing em Word/ }).click()]);
  expect(docx.suggestedFilename()).toMatch(/^pop_marketing_\d{4}-\d{2}-\d{2}\.docx$/);
});
