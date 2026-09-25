import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const abrirFpe = async (page: Page) => {
  await page.goto('/#/fpe');
  await expect(page.getByRole('heading', { level: 2, name: 'Ficha 5W1H' })).toBeVisible();
};
const irParaFicha = async (page: Page) => {
  await page.getByRole('button', { name: /^Vendas/ }).first().click();
  await page.getByRole('button', { name: /Atendimento/ }).first().click();
  await page.getByRole('button', { name: /^Aborda o lead rapidamente/ }).first().click();
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // limpa só na primeira carga do teste (o teste de recarregar precisa manter o que foi guardado)
    if (!sessionStorage.getItem('e2e_limpo')) {
      localStorage.clear();
      sessionStorage.setItem('e2e_limpo', '1');
    }
  });
});

test('FPE: abre pré-preenchido, edita, gera o fluxograma com a edição, recarrega e mantém, restaura o padrão', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));

  await abrirFpe(page);
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('236 fichas');
  await irParaFicha(page);
  await expect(page.getByLabel(/^O quê/)).toHaveValue('Aborda o lead rapidamente');
  await expect(page.getByLabel(/^Por quê/)).not.toHaveValue('');

  await page.getByLabel(/^O quê/).fill('Aborda o lead pelo WhatsApp em minutos');
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('1 editada');

  await page.getByRole('button', { name: /^Gerar fluxograma do setor Vendas/ }).click();
  const svg = page.getByRole('region', { name: 'Fluxo do setor Vendas' }).locator('svg');
  await expect(svg).toBeVisible();
  const texto = await svg.evaluate((el) => [...el.querySelectorAll('text')].map((t) => t.textContent).join(' '));
  expect(texto).toContain('Aborda o lead pelo WhatsApp em minutos');
  expect(texto).not.toContain('Aborda o lead rapidamente');
  await page.screenshot({ path: 'screenshots/fpe_fluxo_editado.png', fullPage: true });

  // guardado no navegador com origem "manual"
  const guardado = await page.evaluate(() => localStorage.getItem('lux_fpe_estado_v1'));
  expect(guardado).toContain('"origem":"manual"');

  await page.reload();
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('1 editada');
  await page.getByRole('button', { name: /^Vendas/ }).first().click();
  await page.getByRole('button', { name: /Atendimento/ }).first().click();
  await page.getByRole('button', { name: /^Aborda o lead pelo WhatsApp em minutos/ }).click();
  await expect(page.getByLabel(/^O quê/)).toHaveValue('Aborda o lead pelo WhatsApp em minutos');

  await page.getByRole('button', { name: /^Restaurar o padrão da ficha/ }).click();
  await expect(page.getByLabel(/^O quê/)).toHaveValue('Aborda o lead rapidamente');
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('0 editadas');
  expect(erros).toEqual([]);
});

test('FPE: fluxograma geral por fase e aviso de fluxograma desatualizado', async ({ page }) => {
  await abrirFpe(page);
  await page.getByLabel('Fase do fluxograma geral').selectOption('2');
  await page.getByRole('button', { name: 'Gerar fluxograma geral da fase' }).click();
  await expect(page.getByRole('region', { name: 'Fluxo geral — Fase 2: Técnica/Projeto' }).locator('svg')).toBeVisible();
  await page.getByLabel(/^Quem/).fill('Marketing e Vendas');
  await expect(page.getByText(/Você editou fichas depois de gerar este fluxograma/)).toBeVisible();
});

test('FPE: só pelo teclado e sem rolagem horizontal da página no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirFpe(page);
  const chip = page.getByRole('button', { name: /^Vendas/ }).first();
  await chip.focus();
  await page.keyboard.press('Enter');
  await expect(chip).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: /^Gerar fluxograma do setor Vendas/ }).click();
  await expect(page.getByRole('region', { name: 'Fluxo do setor Vendas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
