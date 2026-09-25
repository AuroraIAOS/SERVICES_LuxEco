import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const abrirPop = async (page: Page) => {
  await page.goto('/#/pop');
  await expect(page.getByRole('heading', { level: 1, name: 'POP' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Gerar POP do setor/ })).toBeVisible();
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

test('POP: perguntas pré-preenchidas, edita, gera o POP do setor, recarrega e mantém', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));

  await abrirPop(page);
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('12 setores');
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('11 seções por POP');
  const campos = page.getByRole('textbox');
  expect(await campos.count()).toBeGreaterThanOrEqual(8);
  await expect(campos.first()).not.toHaveValue('');

  await page.getByRole('button', { name: 'Vendas', exact: true }).click();
  const objetivo = page.getByRole('textbox', { name: 'Qual é o objetivo de Vendas no ciclo de serviço?' });
  await objetivo.fill('Conduzir a venda com clareza e sem prometer o que a Lux não documentou.');
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('1 resposta editada');

  await page.getByRole('button', { name: 'Gerar POP do setor Vendas' }).click();
  const pop = page.getByRole('article', { name: 'POP — Vendas' });
  await expect(pop).toBeVisible();
  await expect(pop.getByRole('heading', { level: 3 })).toHaveCount(11);
  await expect(pop).toContainText('Conduzir a venda com clareza e sem prometer o que a Lux não documentou.');
  await page.screenshot({ path: 'screenshots/pop_vendas.png', fullPage: true });

  // seção 11 sempre por último, com os 4 itens
  await pop.getByRole('button', { name: /Observações para revisão jurídica/ }).click();
  const juridica = pop.getByRole('region', { name: /Observações para revisão jurídica/ });
  await expect(juridica.getByRole('listitem')).toHaveCount(4);
  await expect(juridica).toContainText('“boleto”');
  await expect(juridica).toContainText('IBS');

  const guardado = await page.evaluate(() => localStorage.getItem('lux_pop_estado_v1'));
  expect(guardado).toContain('"origem":"manual"');

  await page.reload();
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('1 resposta editada');
  await page.getByRole('button', { name: 'Vendas', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Qual é o objetivo de Vendas no ciclo de serviço?' })).toHaveValue('Conduzir a venda com clareza e sem prometer o que a Lux não documentou.');
  expect(erros).toEqual([]);
});

test('POP: gera o POP geral com as 236 fichas em poucos segundos', async ({ page }) => {
  await abrirPop(page);
  const inicio = Date.now();
  await page.getByRole('button', { name: 'Gerar POP geral' }).click();
  const pop = page.getByRole('article', { name: 'POP geral — Lux Eco Solutions' });
  await expect(pop).toBeVisible();
  expect(Date.now() - inicio).toBeLessThan(5000);
  await pop.getByRole('button', { name: 'Abrir todas as seções' }).click();
  await expect(pop.locator('.pop-passo')).toHaveCount(236);
});

test('POP: a edição feita no FPE chega ao procedimento do POP', async ({ page }) => {
  await page.goto('/#/fpe');
  await page.getByRole('button', { name: /^Cemig/ }).first().click();
  await page.getByRole('button', { name: /Vistoria técnica/ }).first().click();
  await page.getByRole('button', { name: /^Realiza a vistoria técnica externa/ }).first().click();
  await page.getByLabel(/^Como/).fill('Vistoria conforme o roteiro da concessionária.');

  await page.getByRole('link', { name: 'POP' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'POP' })).toBeVisible();
  await page.getByRole('button', { name: 'Cemig', exact: true }).click();
  await page.getByRole('button', { name: 'Gerar POP do setor Cemig' }).click();
  await page.getByRole('button', { name: /Procedimento/ }).click();
  await expect(page.getByText('Vistoria conforme o roteiro da concessionária.')).toBeVisible();
});

test('POP: no celular (390 px) não rola na horizontal, nem com o POP aberto', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await abrirPop(page);
  await page.getByRole('button', { name: 'Gerar POP do setor Marketing' }).click();
  await page.getByRole('button', { name: 'Abrir todas as seções' }).click();
  const largura = await page.evaluate(() => ({ rolagem: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(largura.rolagem).toBeLessThanOrEqual(largura.janela);
});
