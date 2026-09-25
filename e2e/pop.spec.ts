import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { execFileSync } from 'node:child_process';
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

const infoPdf = (buffer: Buffer) => {
  const texto = buffer.toString('latin1');
  const caixa = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(texto);
  return { largura: Number(caixa?.[1]), altura: Number(caixa?.[2]), paginas: (texto.match(/\/Type\s*\/Page[^s]/g) ?? []).length };
};

test('POP: exporta .docx de verdade (nome padrão, 11 seções) e PDF A4 com a marca', async ({ page }) => {
  await page.addInitScript(() => {
    // a caixa de impressão não existe no headless: guarda que foi pedida e deixa a área montada
    (window as unknown as { __impressoes: number }).__impressoes = 0;
    window.print = () => {
      (window as unknown as { __impressoes: number }).__impressoes++;
    };
  });
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));

  await abrirPop(page);
  await page.getByRole('button', { name: 'Vendas', exact: true }).click();
  await expect(page.getByRole('button', { name: /Exportar/ })).toHaveCount(0); // nada para exportar antes de gerar
  await page.getByRole('button', { name: 'Gerar POP do setor Vendas' }).click();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar POP — Vendas em Word (.docx)' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^pop_vendas_\d{4}-\d{2}-\d{2}\.docx$/);
  const caminho = await download.path();
  const saida = execFileSync('node', ['scripts/verificar_docx.mjs', caminho], { encoding: 'utf8' });
  expect(saida.trim()).toBe('OK: secoes=11');

  await page.getByRole('button', { name: 'Exportar POP — Vendas em PDF (.pdf)' }).click();
  expect(await page.evaluate(() => (window as unknown as { __impressoes: number }).__impressoes)).toBe(1);
  expect(await page.title()).toMatch(/^pop_vendas_\d{4}-\d{2}-\d{2}$/);
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  const area = page.locator('#lux-impressao');
  await expect(area.getByRole('heading', { level: 1 })).toHaveText('POP — Vendas');
  await expect(area.locator('.impressao__secao-pop')).toHaveCount(11);
  await expect(area).toContainText('Uso interno da Lux Eco Solutions');
  await area.screenshot({ path: 'screenshots/pdf_pop_vendas.png' });
  const info = infoPdf(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
  expect(Math.abs(info.largura - 595.28)).toBeLessThan(1); // A4
  expect(Math.abs(info.altura - 841.89)).toBeLessThan(1);
  expect(info.paginas).toBeGreaterThan(1);
  expect(erros).toEqual([]);
});

test('POP + IA: sem ciência nada sai; com ciência a sugestão vem pelo failover (rede simulada) e o teto R$ 0 vale', async ({ page }) => {
  const pedidos: string[] = [];
  await page.route('https://openrouter.ai/**', async (rota) => {
    const corpo = JSON.parse(rota.request().postData() ?? '{}') as { model: string };
    pedidos.push(corpo.model);
    // o 1º modelo está fora do ar; o 2º responde
    if (pedidos.length === 1) return rota.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { code: 404 } }) });
    return rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: 'Gerar e encaminhar leads ao setor de Vendas e cuidar da propaganda da marca.' } }], usage: { prompt_tokens: 90, completion_tokens: 25 } }) });
  });
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));

  await abrirPop(page);
  const botaoIa = page.getByRole('button', { name: /^Redigir com IA: Qual é o objetivo do Marketing/ });
  await botaoIa.click();
  await expect(page.getByText('Marque a ciência de envio ao provedor externo')).toBeVisible();
  expect(pedidos).toHaveLength(0);

  await page.getByRole('button', { name: /IA \(opcional\)/ }).click();
  await expect(page.getByRole('note')).toContainText('provedor externo');
  await page.getByRole('checkbox', { name: /Entendo que o texto será enviado/ }).check();
  await botaoIa.click();
  const sugestao = page.getByRole('group', { name: /Sugestão da IA: Qual é o objetivo do Marketing/ });
  await expect(sugestao).toContainText('Gerar e encaminhar leads ao setor de Vendas e cuidar da propaganda da marca.');
  expect(pedidos).toHaveLength(2); // 404 no principal → reserva 1
  expect(new Set(pedidos).size).toBe(2);
  await sugestao.getByRole('button', { name: 'Usar esta redação' }).click();
  await expect(page.getByRole('textbox', { name: 'Qual é o objetivo do Marketing no ciclo de serviço?' })).toHaveValue('Gerar e encaminhar leads ao setor de Vendas e cuidar da propaganda da marca.');

  // painel: uso guardado; sem chave no armazenamento do navegador (redação e limite no mesmo quadro, já aberto)
  await expect(page.getByText(/Chamadas hoje/)).toContainText('2 de 50');
  const guardado = await page.evaluate(() => Object.entries(localStorage).map(([k, v]) => `${k}=${v}`).join('\n'));
  expect(guardado).not.toMatch(/sk-or|Bearer|api_key/i);
  expect(erros.filter((e) => !/404/.test(e))).toEqual([]);
  await page.screenshot({ path: 'screenshots/pop_ia.png', fullPage: true });
});

test('XLSX: baixa a planilha de verdade pelo FPE e pelo POP, com 17 abas e as suas edições', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));

  // 1) edita uma ficha no FPE e baixa a planilha pelo painel do FPE
  await page.goto('/#/fpe');
  await page.getByRole('button', { name: /^Vendas/ }).first().click();
  await page.getByRole('button', { name: /Atendimento/ }).first().click();
  await page.getByRole('button', { name: /^Aborda o lead rapidamente/ }).first().click();
  await page.getByLabel(/^O quê/).fill('Aborda o lead pelo WhatsApp em minutos');
  const [d1] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Exportar planilha .* em Excel \(\.xlsx\)$/ }).click()]);
  expect(d1.suggestedFilename()).toMatch(/^lux_fpe-pop_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const wb1 = XLSX.read(readFileSync(await d1.path()), { type: 'buffer' });
  expect(wb1.SheetNames).toHaveLength(17);
  expect(wb1.SheetNames.slice(12)).toEqual(['Documentos', 'Ferramentas', 'Investimentos', 'KPIs', 'POP geral']);
  const vendas = XLSX.utils.sheet_to_json<string[]>(wb1.Sheets['Vendas']!, { header: 1 });
  expect(vendas.some((l) => l[3] === 'Aborda o lead pelo WhatsApp em minutos')).toBe(true);

  // 2) responde uma pergunta no POP, gera o POP e baixa a planilha pelo painel do POP
  await page.getByRole('link', { name: 'POP' }).click();
  await page.getByRole('textbox', { name: 'Qual é o objetivo do Marketing no ciclo de serviço?' }).fill('Objetivo revisado para a planilha.');
  await page.getByRole('button', { name: 'Gerar POP do setor Marketing' }).click();
  const [d2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Exportar planilha .* em Excel \(\.xlsx\)$/ }).click()]);
  const wb2 = XLSX.read(readFileSync(await d2.path()), { type: 'buffer' });
  const pop = XLSX.utils.sheet_to_json<string[]>(wb2.Sheets['POP geral']!, { header: 1 });
  expect(pop.some((l) => l[2] === 'Resposta' && l[3] === 'Objetivo revisado para a planilha.')).toBe(true);
  expect(pop.some((l) => l[2] === 'Passo' && l[3]?.endsWith('Aborda o lead pelo WhatsApp em minutos'))).toBe(true); // a edição do FPE também chegou ao POP
  expect(erros).toEqual([]);
});
