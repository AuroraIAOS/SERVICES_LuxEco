import { expect, test } from '@playwright/test';

test('HashRouter abre as 4 rotas e a fonte da marca carrega', async ({ page }) => {
  for (const [hash, titulo] of [['#/mmo', 'MMO v02'], ['#/fpe', 'FPE'], ['#/pop', 'POP'], ['#/versoes', 'Versões salvas']]) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
  }
  const familia = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
  });
  expect(familia.join(',')).toContain('Cyntho Next');
});
