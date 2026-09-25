import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const abrirMmo = async (page: Page) => {
  const inicio = Date.now();
  await page.goto('/#/mmo');
  await expect(page.getByRole('heading', { level: 1, name: 'MMO' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^\d{2} / })).toHaveCount(22);
  return Date.now() - inicio;
};

test('MMO: renderiza em menos de 2 s, com números calculados e sem erro no console', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));

  const ms = await abrirMmo(page);
  expect(ms, `renderização inicial em ${ms} ms`).toBeLessThan(2000);

  const resumo = page.getByRole('list', { name: 'Resumo' });
  await expect(resumo).toContainText('12 setores');
  await expect(resumo).toContainText('22 estágios');
  await expect(resumo).toContainText('236 ações');
  await expect(resumo).toContainText('37 decisões IF/ELSE');
  await expect(resumo).toContainText('4 equipes técnicas');
  await expect(resumo).toContainText('2 regiões');
  expect(await page.locator('body').innerText()).not.toContain(['210', '+'].join(''));

  await page.screenshot({ path: 'screenshots/mmo_desktop_topo.png' });
  expect(erros).toEqual([]);
});

test('MMO: 4 fases com os 22 estágios; abrir o Est. 02 mostra as ramificações da V08 (perfis, Energia por Assinatura)', async ({ page }) => {
  await abrirMmo(page);
  await expect(page.getByRole('group')).toHaveCount(4);

  await page.getByRole('button', { name: /^02 Atendimento/ }).click();
  const est2 = page.getByRole('region', { name: /^Vendas,/ }).first();
  await expect(est2.getByText('Aborda o lead rapidamente')).toBeVisible();
  await expect(est2.getByText('Inicia o atendimento com pergunta aberta')).toBeVisible();
  await expect(page.getByText('oferece Energia por Assinatura da Lux').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Triagem por perfil do cliente' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Classificação do lead' })).toContainText('Lead Quente');

  await page.getByRole('button', { name: /^22 Pós-venda/ }).click();
  await expect(page.getByText('Solicita indicações ao cliente')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Oportunidades a identificar' }).last()).toContainText('Retrofit');

  await page.screenshot({ path: 'screenshots/mmo_desktop_estagios_abertos.png', fullPage: true });
});

test('MMO: cada fase mantém um estágio aberto por vez e o Grupo de Fluxo sai com a etiqueta WhatsApp', async ({ page }) => {
  await abrirMmo(page);
  const b1 = page.getByRole('button', { name: /^01 Prospecção/ });
  const b2 = page.getByRole('button', { name: /^02 Atendimento/ });
  await b1.click();
  await expect(b1).toHaveAttribute('aria-expanded', 'true');
  await b2.click();
  await expect(b2).toHaveAttribute('aria-expanded', 'true');
  await expect(b1).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: /^07 Aprovação do contrato/ }).click();
  const acao = page.getByText('Cria o Grupo de Fluxo no WhatsApp com o cliente (canal temporário)');
  await expect(acao).toBeVisible();
  await expect(acao.locator('xpath=..').getByText('WhatsApp', { exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/\(GRUPO DE FLUXO\)/);
});

test('MMO: só pelo teclado (Tab até o estágio, Enter abre, Espaço fecha) e foco visível', async ({ page }) => {
  await abrirMmo(page);
  const botao = page.getByRole('button', { name: /^01 Prospecção/ });
  await botao.focus();
  await expect(botao).toBeFocused();
  const anel = await botao.evaluate((el) => {
    const c = getComputedStyle(el);
    return `${c.outlineStyle} ${c.outlineWidth}`;
  });
  expect(anel).toBe('solid 3px');
  await page.keyboard.press('Enter');
  await expect(botao).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(botao).toHaveAttribute('aria-expanded', 'false');
});

test('MMO: 12 setores (um aberto por vez), 21 decisões IF/ELSE e a jornada de 10 fases', async ({ page }) => {
  await abrirMmo(page);
  const setores = page.getByRole('button', { name: /^S\d{2} / });
  await expect(setores).toHaveCount(12);
  await page.getByRole('button', { name: /^S01 Marketing/ }).click();
  await expect(page.getByText('Atua em 4 de 22 estágios: 01 a 03 e 22.')).toBeVisible();
  await page.getByRole('button', { name: /^S10 Equipe Técnica/ }).click();
  await expect(page.getByRole('button', { name: /^S01 Marketing/ })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Equipes: Lavras: Tiago/Illumini e Vinícius; Passos: Odirley/Lumines e João Paulo/C7.')).toBeVisible();

  const decisoes = page.getByRole('region', { name: 'Decisões IF/ELSE' });
  await expect(decisoes.getByRole('article')).toHaveCount(21);
  await expect(page.getByRole('region', { name: /Jornada do cliente em 10 fases/ }).getByRole('listitem')).toHaveCount(10);
});

test('MMO: no celular (390 px) não há rolagem horizontal e os estágios continuam abrindo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirMmo(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: /^02 Atendimento/ }).click();
  await expect(page.getByRole('region', { name: /^Vendas,/ }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'screenshots/mmo_celular_est2_aberto.png' });
});
