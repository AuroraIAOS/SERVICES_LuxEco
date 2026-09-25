// Prova de ponta a ponta da API de backups NO SERVIDOR (03.5): APP_URL + SMOKE_BASIC_* do .env (nunca imprime valores).
// Percorre: 401 sem senha → criar → listar → baixar → proteger → excluir (protegido fica) → zip → encher até o limite → 11º = 409
// → excluir → config_llm. Só apaga o que ELA mesma criou; não mexe em versões que já existam. Sai com exit 0 e uma linha final OK.
// Uso: npm run backup:provar
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const env = {};
for (const linha of readFileSync(join(RAIZ, '.env'), 'utf8').replace(/\r\n/g, '\n').split('\n')) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(linha);
  if (!m) continue;
  const aspas = /^(["'])(.*?)\1(\s+#.*)?$/.exec(m[2].trim());
  env[m[1]] = aspas ? aspas[2] : m[2].replace(/\s+#.*$/, '').trim();
}
for (const k of ['APP_URL', 'SMOKE_BASIC_USER', 'SMOKE_BASIC_PASS']) {
  if (!env[k]) {
    console.log(`ERRO: variável ${k} ausente no .env (valores nunca são impressos).`);
    process.exit(1);
  }
}
const API = `${env.APP_URL.replace(/\/?$/, '/')}api/backups.php`;
const AUTH = `Basic ${Buffer.from(`${env.SMOKE_BASIC_USER}:${env.SMOKE_BASIC_PASS}`).toString('base64')}`;
const ESTADO = { schema_versao: 1, fpe_edicoes: {}, pop_respostas: {}, gerado_em: new Date().toISOString() };
const html = (n) => `<!doctype html><html lang="pt-BR"><body><h1>Prova automática ${n}</h1><script type="application/json" id="lux-estado">${JSON.stringify(ESTADO)}</script></body></html>`;

const criados = [];
const status = {};
let falhas = 0;
const conferir = (ok, msg) => {
  if (!ok) {
    falhas++;
    console.log(`  ✗ ${msg}`);
  } else console.log(`  ✓ ${msg}`);
  return ok;
};

async function chamar(acao, { metodo, corpo, auth = true, requisicao = true, query = {} } = {}) {
  const url = new URL(API);
  url.searchParams.set('acao', acao);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const m = metodo ?? (corpo === undefined ? 'GET' : 'POST');
  const cab = {};
  if (auth) cab.Authorization = AUTH;
  if (m !== 'GET' && requisicao) cab['X-Lux-Requisicao'] = '1';
  if (corpo !== undefined) cab['Content-Type'] = 'application/json';
  const r = await fetch(url, { method: m, headers: cab, body: corpo === undefined ? undefined : JSON.stringify(corpo), redirect: 'manual' });
  const bytes = new Uint8Array(await r.arrayBuffer());
  const texto = new TextDecoder().decode(bytes);
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // download
  }
  return { status: r.status, bytes, texto, json, headers: r.headers };
}

async function limpar() {
  for (const id of criados) {
    await chamar('proteger', { corpo: { id, valor: false } }).catch(() => undefined);
    await chamar('excluir', { corpo: { ids: [id] } }).catch(() => undefined);
  }
}

try {
  console.log(`API: ${new URL(API).host}${new URL(API).pathname}`);

  console.log('1) proteção');
  const sem = await chamar('listar', { auth: false });
  conferir(sem.status === 401, `sem senha → ${sem.status} (esperado 401)`);
  // O WAF da hospedagem (ModSecurity) barra `../` na URL antes do PHP (406/403); se passar, a API responde 400. Nos dois casos nada é lido.
  const trav = await chamar('baixar', { query: { id: '../../.env' } });
  conferir([400, 403, 406].includes(trav.status), `id com ../ → ${trav.status} (recusado: 400 da API ou 403/406 do WAF da hospedagem)`);
  const malformado = await chamar('baixar', { query: { id: 'bk_20260101_000000_zzzzzzzz' } });
  conferir(malformado.status === 400, `id fora do formato → ${malformado.status} (esperado 400, da API)`);
  const ataqueEnv = await chamar('baixar', { query: { id: 'bk_20260101_000000_abcdef12\n../../.env' } });
  conferir([400, 403, 406].includes(ataqueEnv.status), `id com quebra de linha e ../ → ${ataqueEnv.status} (recusado)`);
  const semCab = await chamar('criar', { corpo: { html: html(0) }, requisicao: false });
  conferir(semCab.status === 403, `criar sem X-Lux-Requisicao → ${semCab.status} (esperado 403)`);

  console.log('2) listar');
  const base = await chamar('listar');
  status.listar = base.status;
  conferir(base.status === 200 && Array.isArray(base.json?.itens), `listar → ${base.status}`);
  const limite = base.json?.limite ?? 10;
  const existentes = base.json?.total ?? 0;
  console.log(`   já há ${existentes} versão(ões) no servidor; limite ${limite}`);
  if (existentes >= limite - 1) {
    console.log(`ERRO: o servidor já tem ${existentes} de ${limite} versões; a prova precisa de pelo menos 2 vagas para não mexer nas suas versões. Libere espaço e rode de novo.`);
    process.exit(1);
  }

  console.log('3) criar, baixar, proteger, excluir, zip');
  const c = await chamar('criar', { corpo: { html: html(1), rotulo: 'prova_automatica', escopo: 'completo', versao_app: 'prova' } });
  status.criar = c.status;
  if (!conferir(c.status === 201 && /^bk_\d{8}_\d{6}_[0-9a-f]{8}$/.test(c.json?.id ?? ''), `criar → ${c.status}`)) throw new Error('criar falhou');
  const id = c.json.id;
  criados.push(id);
  const l = await chamar('listar');
  conferir(l.status === 200 && l.json.itens.some((i) => i.id === id && i.rotulo === 'prova_automatica'), `listar mostra a versão criada (${l.json?.total} de ${limite})`);
  const b = await chamar('baixar', { query: { id } });
  status.baixar = b.status;
  conferir(b.status === 200 && b.texto === html(1) && /attachment/.test(b.headers.get('content-disposition') ?? ''), `baixar → ${b.status}, conteúdo idêntico, como anexo`);
  const v = await chamar('ver', { query: { id } });
  conferir(v.status === 200 && /sandbox/.test(v.headers.get('content-security-policy') ?? ''), `ver → ${v.status}, com Content-Security-Policy: sandbox`);
  const z = await chamar('baixar_zip', { corpo: { ids: [id] } });
  status.zip = z.status;
  conferir(z.status === 200 && z.bytes[0] === 0x50 && z.bytes[1] === 0x4b, `zip → ${z.status} (assinatura PK)`);
  await chamar('proteger', { corpo: { id, valor: true } });
  const ex1 = await chamar('excluir', { corpo: { ids: [id] } });
  conferir(ex1.status === 200 && ex1.json.ignorados_protegidos?.[0] === id, 'protegido não é excluído');
  await chamar('proteger', { corpo: { id, valor: false } });

  console.log('4) limite');
  while (true) {
    const atual = (await chamar('listar')).json.total;
    if (atual >= limite) break;
    const n = await chamar('criar', { corpo: { html: html(criados.length + 1), rotulo: 'prova_automatica' } });
    if (n.status !== 201) throw new Error(`criar durante o preenchimento → ${n.status}`);
    criados.push(n.json.id);
  }
  const onze = await chamar('criar', { corpo: { html: html(99), rotulo: 'prova_onze' } });
  status.onze = onze.status;
  conferir(onze.status === 409 && onze.json?.erro === 'limite_atingido', `versão ${limite + 1} → ${onze.status} (esperado 409)`);
  const depois = await chamar('listar');
  conferir(depois.json.total === limite, `nada foi apagado em silêncio (${depois.json.total} de ${limite})`);

  console.log('5) excluir o que a prova criou');
  const ex = await chamar('excluir', { corpo: { ids: criados.slice(0, 50) } });
  status.excluir = ex.status;
  conferir(ex.status === 200 && ex.json.excluidos.length === criados.length, `excluir → ${ex.status} (${ex.json?.excluidos?.length} de ${criados.length})`);
  criados.length = 0;
  const fim = await chamar('listar');
  conferir(fim.json.total === existentes, `voltou a ${fim.json.total} versão(ões), como antes (${existentes})`);

  console.log('6) config_llm (grava o mesmo conteúdo que já existe, ou o padrão seguro)');
  const cfgAtual = await chamar('config_ler');
  const padrao = { schema_versao: 1, teto_mensal_brl: 0, alerta_percentual: 95, limite_diario_requisicoes: 50, modelos: JSON.parse(readFileSync(join(RAIZ, 'data/conteudo/llm_modelos.json'), 'utf8')).modelos, atualizado_em: new Date().toISOString() };
  const cfg = cfgAtual.json?.existe ? cfgAtual.json.config : padrao;
  const g = await chamar('config_gravar', { corpo: cfg });
  const r = await chamar('config_ler');
  status.config = g.status === 200 && r.status === 200 ? 200 : Math.max(g.status, r.status);
  conferir(g.status === 200 && r.json?.existe === true && JSON.stringify(r.json.config) === JSON.stringify(cfg), `config gravada e lida de volta → ${status.config}`);
  const ruim = await chamar('config_gravar', { corpo: { ...cfg, api_key: 'sk-or-v1-nao-deve-gravar' } });
  conferir(ruim.status === 422, `config com chave de API → ${ruim.status} (esperado 422)`);
} catch (e) {
  falhas++;
  console.log(`ERRO: ${e.message}`);
} finally {
  await limpar();
}

if (falhas) {
  console.log(`FALHOU: ${falhas} verificação(ões).`);
  process.exit(1);
}
console.log(`OK backup: criar=${status.criar} listar=${status.listar} baixar=${status.baixar} zip=${status.zip} excluir=${status.excluir} onze=${status.onze} config=${status.config}`);
