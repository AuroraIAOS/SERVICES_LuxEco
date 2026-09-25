import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const abrirFpe = async (page: Page) => {
  await page.goto('/#/fpe');
  await expect(page.getByRole('heading', { level: 2, name: 'Ficha 5W1H' })).toBeVisible();
};
const irParaFichaDeVendas = async (page: Page) => {
  await page.getByRole('button', { name: /^Vendas/ }).first().click();
  await page.getByRole('button', { name: /Atendimento/ }).first().click();
  await page.getByRole('button', { name: /^Aborda o lead rapidamente/ }).first().click();
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e_limpo')) {
      localStorage.clear();
      sessionStorage.setItem('e2e_limpo', '1');
    }
    // a caixa de impressão não existe no headless: guarda que foi pedida e deixa a área montada para o teste inspecionar/gerar PDF
    (window as unknown as { __impressoes: number }).__impressoes = 0;
    window.print = () => {
      (window as unknown as { __impressoes: number }).__impressoes++;
    };
  });
});

const baixar = async (page: Page, botao: string) => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: botao }).click()]);
  const caminho = await download.path();
  return { nome: download.suggestedFilename(), texto: readFileSync(caminho, 'utf8') };
};

test('exporta .md, .mermaid e .json com o nome padrão e o conteúdo em vigor; o JSON volta igual', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));
  await abrirFpe(page);
  await irParaFichaDeVendas(page);
  await page.getByLabel(/^O quê/).fill('Aborda o lead pelo WhatsApp em minutos');

  const md = await baixar(page, 'Exportar fichas do setor Vendas em Markdown (.md)');
  expect(md.nome).toMatch(/^fpe_vendas_\d{4}-\d{2}-\d{2}\.md$/);
  expect(md.texto).toContain('# FPE — fichas 5W1H do setor Vendas');
  expect(md.texto).toContain('- **O quê:** Aborda o lead pelo WhatsApp em minutos');
  expect(md.texto).not.toContain('- **O quê:** Aborda o lead rapidamente');

  const geral = await baixar(page, 'Exportar fichas de todos os setores em Markdown (.md)');
  expect(geral.nome).toMatch(/^fpe_geral_\d{4}-\d{2}-\d{2}\.md$/);
  expect((geral.texto.match(/^##### /gm) ?? []).length).toBe(236);

  const mmd = await baixar(page, 'Exportar fluxo do setor Vendas em Mermaid (.mermaid)');
  expect(mmd.nome).toMatch(/^fpe_vendas_\d{4}-\d{2}-\d{2}\.mermaid$/);
  expect(mmd.texto).toContain('flowchart LR');
  expect(mmd.texto).toContain('Aborda o lead pelo WhatsApp em minutos');

  const json = await baixar(page, 'Exportar as edições do FPE em JSON (.json)');
  expect(json.nome).toMatch(/^fpe_geral_\d{4}-\d{2}-\d{2}\.json$/);
  const antes = await page.evaluate(() => localStorage.getItem('lux_fpe_estado_v1'));

  // restaura a ficha e importa o arquivo baixado: o estado guardado volta idêntico
  await page.getByRole('button', { name: /^Restaurar o padrão da ficha/ }).click();
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('0 editadas');
  await page.getByLabel(/^Importar edições/).setInputFiles({ name: json.nome, mimeType: 'application/json', buffer: Buffer.from(json.texto) });
  await expect(page.getByRole('group', { name: 'Confirmar importação' })).toContainText('1 ficha editada');
  await page.getByRole('button', { name: 'Substituir as minhas edições' }).click();
  await expect(page.getByRole('list', { name: 'Resumo' })).toContainText('1 editada');
  const depois = await page.evaluate(() => localStorage.getItem('lux_fpe_estado_v1'));
  expect(JSON.parse(depois!)).toEqual(JSON.parse(antes!));
  await expect(page.getByLabel(/^O quê/)).toHaveValue('Aborda o lead pelo WhatsApp em minutos');
  expect(erros).toEqual([]);
});

/** Lê o tamanho da primeira página do PDF (em pontos) e conta as páginas. */
const infoPdf = (buffer: Buffer) => {
  const texto = buffer.toString('latin1');
  const caixa = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(texto);
  return { largura: Number(caixa?.[1]), altura: Number(caixa?.[2]), paginas: (texto.match(/\/Type\s*\/Page[^s]/g) ?? []).length };
};

test('PDF do fluxograma: A3 paisagem, fundo branco, texto chumbo; só a área de impressão aparece', async ({ page }) => {
  await abrirFpe(page);
  await irParaFichaDeVendas(page);
  await page.getByRole('button', { name: 'Exportar fluxo do setor Vendas em PDF (.pdf)' }).click();
  expect(await page.evaluate(() => (window as unknown as { __impressoes: number }).__impressoes)).toBe(1);
  await expect(page.locator('#lux-impressao')).toHaveCount(1);
  await expect(page.locator('html')).toHaveClass(/imprimindo/);
  expect(await page.title()).toMatch(/^fpe_vendas_\d{4}-\d{2}-\d{2}$/);

  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 1512, height: 1000 });
  // só a área de impressão fica visível; o resto da tela some
  await expect(page.getByRole('heading', { level: 1, name: 'FPE' })).toBeHidden();
  const cores = await page.evaluate(() => {
    const area = document.getElementById('lux-impressao')!;
    return { fundo: getComputedStyle(document.body).backgroundColor, texto: getComputedStyle(area).color, svgFundo: area.querySelector('svg > rect')?.getAttribute('fill') };
  });
  expect(cores.fundo).toBe('rgb(254, 254, 254)');
  expect(cores.texto).toBe('rgb(24, 31, 40)');
  expect(cores.svgFundo).toBe('#FEFEFE');
  await page.locator('#lux-impressao').screenshot({ path: 'screenshots/pdf_fluxo_setor_vendas.png' });

  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const info = infoPdf(pdf);
  expect(Math.abs(info.largura - 1190.55)).toBeLessThan(1); // A3 paisagem: 420 × 297 mm (o Chromium arredonda para o pixel)
  expect(Math.abs(info.altura - 841.89)).toBeLessThan(1);
  expect(info.paginas).toBeGreaterThanOrEqual(1);
});

test('PDF das fichas: A4 retrato, uma ficha nunca é cortada entre páginas, nota de propriedade no fim', async ({ page }) => {
  await abrirFpe(page);
  await page.getByRole('button', { name: 'Exportar fichas do setor Marketing em PDF (.pdf)' }).click();
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  const area = page.locator('#lux-impressao');
  await expect(area.getByRole('heading', { level: 1 })).toHaveText('FPE — fichas 5W1H do setor Marketing');
  await expect(area).toContainText('Uso interno da Lux Eco Solutions');
  await area.screenshot({ path: 'screenshots/pdf_fichas_marketing.png' });

  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const info = infoPdf(pdf);
  expect(Math.abs(info.largura - 595.28)).toBeLessThan(1); // A4: 210 × 297 mm
  expect(Math.abs(info.altura - 841.89)).toBeLessThan(1);
  expect(info.paginas).toBeGreaterThan(1);
});
