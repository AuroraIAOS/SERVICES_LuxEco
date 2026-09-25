import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { AUTH_TESTE, subirApi } from '../scripts/api_local.ts';
import type { AmbienteApi } from '../scripts/api_local.ts';

// O app roda no `vite preview` (estático, sem PHP). Aqui as chamadas a ./api/backups.php vão para o PHP DE VERDADE
// (backups.php em servidor embutido, pasta temporária): mesmo código que roda na hospedagem, sem mock.
let api: AmbienteApi;

test.beforeAll(async () => {
  api = await subirApi();
});
test.afterAll(() => api.parar());

async function ligarApi(context: BrowserContext) {
  await context.route('**/api/backups.php*', async (rota) => {
    const pedido = rota.request();
    const alvo = `${api.url}${new URL(pedido.url()).search}`;
    const cabecalhos: Record<string, string> = { authorization: AUTH_TESTE };
    for (const nome of ['content-type', 'x-lux-requisicao']) {
      const v = pedido.headers()[nome];
      if (v) cabecalhos[nome] = v;
    }
    const resposta = await rota.fetch({ url: alvo, headers: cabecalhos });
    // status, cabeçalhos (inclusive Content-Disposition) e corpo, tal como o PHP mandou
    await rota.fulfill({ status: resposta.status(), headers: resposta.headers(), body: await resposta.body() });
  });
}

test.beforeEach(async ({ page, context }) => {
  await ligarApi(context);
  // esvazia o servidor entre os testes (só a pasta temporária deste teste)
  if (existsSync(api.dir)) for (const nome of readdirSync(api.dir).filter((n) => n.startsWith('bk_'))) rmSync(`${api.dir}/${nome}`, { force: true });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e_limpo')) {
      localStorage.clear();
      sessionStorage.setItem('e2e_limpo', '1');
    }
  });
});

const arquivosNoServidor = () => (existsSync(api.dir) ? readdirSync(api.dir) : []).filter((n) => n.startsWith('bk_') && n.endsWith('.html'));

async function salvarPelaTelaVersoes(page: Page, rotulo: string) {
  await page.getByRole('button', { name: 'Salvar versão' }).click();
  await page.getByLabel(/^Rótulo/).fill(rotulo);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
}

async function editarFichaNoFpe(page: Page, texto: string) {
  await page.goto('/#/fpe');
  await page.getByRole('button', { name: /^Vendas/ }).first().click();
  await page.getByRole('button', { name: /Atendimento/ }).first().click();
  await page.getByRole('button', { name: /^Aborda o lead/ }).first().click();
  await page.getByLabel(/^O quê/).fill(texto);
}

test('Versões: vazio → salvar pelo FPE → 10 de 10 → 11º bloqueado → selecionar todas → zip → proteger → excluir em lote', async ({ page }) => {
  const erros: string[] = [];
  page.on('console', (m) => m.type() === 'error' && !/406|409|404/.test(m.text()) && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));

  await page.goto('/#/versoes');
  await expect(page.getByRole('heading', { level: 2, name: 'Nenhuma versão salva ainda' })).toBeVisible();
  await expect(page.getByText('0 de 10 versões')).toBeVisible();

  // 1) salva pelo botão do FPE (com uma edição) e vê na lista
  await editarFichaNoFpe(page, 'Aborda o lead pelo WhatsApp em minutos');
  const salvarFpe = page.getByRole('button', { name: 'Salvar versão' });
  await expect(salvarFpe).toBeEnabled();
  await salvarFpe.click();
  await page.getByLabel(/^Rótulo/).fill('Pelo FPE');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Versão salva (1 de 10).')).toBeVisible();
  expect(arquivosNoServidor()).toHaveLength(1);

  await page.getByRole('link', { name: 'Ver versões salvas' }).click();
  await expect(page.getByText('1 de 10 versões')).toBeVisible();
  const primeira = page.getByRole('row', { name: /Pelo FPE/ });
  await expect(primeira).toContainText('FPE');
  await expect(primeira).toContainText('V08');

  // 2) mais 9 pela tela de versões até o limite
  for (let i = 2; i <= 10; i++) {
    await salvarPelaTelaVersoes(page, `Versão ${i}`);
    await expect(page.getByText(`Versão salva (${i} de 10).`)).toBeVisible();
  }
  await expect(page.getByText('10 de 10 versões')).toBeVisible();
  await expect(page.getByText(/Limite de 10 versões atingido: para salvar outra, exclua uma versão/)).toBeVisible();
  expect(arquivosNoServidor()).toHaveLength(10);

  // 3) o 11º é recusado (409) sem apagar nada e só oferece substituir com confirmação
  await salvarPelaTelaVersoes(page, 'Onze');
  await expect(page.getByRole('alert')).toContainText('Limite de 10 versões atingido. Exclua versões antigas ou substitua a mais antiga não protegida.');
  const dialogo = page.getByRole('alertdialog', { name: 'Confirmar exclusão da versão mais antiga' });
  await expect(dialogo).toContainText('Pelo FPE'); // a mais antiga não protegida
  expect(arquivosNoServidor()).toHaveLength(10); // nada foi apagado
  await dialogo.getByRole('button', { name: 'Cancelar' }).click();
  expect(arquivosNoServidor()).toHaveLength(10);

  // 4) selecionar todas e baixar o .zip (download de verdade)
  await page.getByRole('checkbox', { name: 'Selecionar todas as versões mostradas' }).check();
  await expect(page.getByText('10 versões selecionadas.')).toBeVisible();
  const [zip] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar .zip' }).click()]);
  expect(zip.suggestedFilename()).toMatch(/^lux_versoes_\d{4}-\d{2}-\d{2}\.zip$/);
  const nomes = Object.keys(unzipSync(new Uint8Array(readFileSync(await zip.path()))));
  expect(nomes).toHaveLength(10);
  expect(nomes.every((n) => /^bk_\d{8}_\d{6}_[0-9a-f]{8}\.html$/.test(n))).toBe(true);

  // 5) protege uma e exclui todas em lote: a protegida fica
  await page.getByRole('button', { name: /^Proteger: Versão 5/ }).click();
  await expect(page.getByText(/Versão protegida: Versão 5/)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Selecionar todas as versões mostradas' }).check();
  await page.getByRole('button', { name: 'Excluir…' }).click();
  const confirmar = page.getByRole('alertdialog', { name: 'Confirmar exclusão' });
  await expect(confirmar).toContainText('Excluir estas 9 versões?');
  await expect(confirmar).toContainText('1 versão protegida fica de fora');
  await confirmar.getByRole('button', { name: 'Excluir definitivamente' }).click();
  await expect(page.getByText(/9 versões excluídas\./)).toBeVisible();
  await expect(page.getByText('1 de 10 versões')).toBeVisible();
  expect(arquivosNoServidor()).toHaveLength(1);
  await expect(page.getByRole('row', { name: /Versão 5/ })).toContainText('Protegida');
  expect(erros).toEqual([]);
  await page.screenshot({ path: 'screenshots/versoes_lista.png', fullPage: true });
});

test('Versões: restaurar substitui o estado local, guarda o ponto de desfazer e “Desfazer” devolve o de antes', async ({ page }) => {
  await editarFichaNoFpe(page, 'Texto da versão salva');
  await page.getByRole('button', { name: 'Salvar versão' }).click();
  await page.getByLabel(/^Rótulo/).fill('Guardada');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Versão salva (1 de 10).')).toBeVisible();

  await page.getByLabel(/^O quê/).fill('Texto que vou perder');
  await page.getByRole('link', { name: 'Ver versões salvas' }).click();
  await page.getByRole('button', { name: /^Restaurar: Guardada/ }).click();
  await expect(page.getByRole('alertdialog', { name: 'Confirmar restauração' })).toContainText('substitui o que está neste navegador');
  await page.getByRole('button', { name: 'Restaurar esta versão' }).click();
  await expect(page.getByText(/Versão restaurada \(FPE\): Guardada/)).toBeVisible();

  // a ficha editada passa a ter o texto novo no nome do botão da lista: procura pelo texto que deve estar em vigor
  const abrirFicha = async (textoEmVigor: RegExp) => {
    await page.getByRole('link', { name: 'FPE', exact: true }).click();
    await page.getByRole('button', { name: /^Vendas/ }).first().click();
    await page.getByRole('button', { name: /Atendimento/ }).first().click();
    await page.getByRole('button', { name: textoEmVigor }).first().click();
  };
  await abrirFicha(/^Texto da versão salva/);
  await expect(page.getByLabel(/^O quê/)).toHaveValue('Texto da versão salva');

  await page.getByRole('link', { name: 'Versões salvas' }).first().click();
  await page.getByRole('button', { name: 'Desfazer última restauração' }).click();
  await expect(page.getByText(/Restauração desfeita/)).toBeVisible();
  await abrirFicha(/^Texto que vou perder/);
  await expect(page.getByLabel(/^O quê/)).toHaveValue('Texto que vou perder');
});

test('Versões: pré-visualizar abre em outra aba, sob sandbox, sem executar nada; baixar entrega o .html', async ({ page, context }) => {
  await page.goto('/#/pop');
  await page.getByRole('textbox', { name: 'Qual é o objetivo do Marketing no ciclo de serviço?' }).fill('Objetivo <img src=x onerror="window.__xss=1"> revisado.');
  await page.getByRole('button', { name: 'Salvar versão' }).click();
  await page.getByLabel(/^Rótulo/).fill('Com HTML');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Versão salva (1 de 10).')).toBeVisible();

  await page.getByRole('link', { name: 'Ver versões salvas' }).click();
  const linha = page.getByRole('row', { name: /Com HTML/ });
  const [aba] = await Promise.all([context.waitForEvent('page'), linha.getByRole('link', { name: /Pré-visualizar/ }).click()]);
  await aba.waitForLoadState();
  await expect(aba.locator('h1')).toContainText('Versão salva — Com HTML');
  expect(await aba.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(await aba.locator('img').count()).toBe(0);
  await aba.close();

  const [baixado] = await Promise.all([page.waitForEvent('download'), linha.getByRole('link', { name: /Baixar/ }).click()]);
  expect(baixado.suggestedFilename()).toMatch(/^bk_\d{8}_\d{6}_[0-9a-f]{8}\.html$/);
  const html = readFileSync(await baixado.path(), 'utf8');
  expect(html).toContain('id="lux-estado"');
  expect(html).not.toContain('<img');
});

test('Versões: no celular (390 px) a página não rola na horizontal (a tabela rola dentro da sua caixa)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/#/versoes');
  for (const rotulo of ['Primeira', 'Segunda', 'Terceira']) {
    await salvarPelaTelaVersoes(page, rotulo);
    await expect(page.getByRole('row', { name: new RegExp(rotulo) })).toBeVisible();
  }
  const m = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(m.pagina).toBeLessThanOrEqual(m.janela);
});

test('Salvar versão sem servidor: botão desativado com explicação e “Baixar arquivo” funciona', async ({ page, context }) => {
  await context.unroute('**/api/backups.php*');
  await context.route('**/api/backups.php*', (rota) => rota.fulfill({ status: 404, body: 'não existe' }));
  await page.goto('/#/fpe');
  const botao = page.getByRole('button', { name: 'Salvar versão' });
  await expect(page.getByText(/O servidor de versões não está disponível aqui/)).toBeVisible();
  await expect(botao).toBeDisabled();
  const [arquivo] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar arquivo' }).click()]);
  expect(arquivo.suggestedFilename()).toMatch(/^versao_fpe_\d{4}-\d{2}-\d{2}_\d{4}\.html$/);
  expect(readFileSync(await arquivo.path(), 'utf8')).toContain('id="lux-estado"');
});
