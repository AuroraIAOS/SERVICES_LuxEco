#!/usr/bin/env node
// scripts/checar_env.mjs — confere o .env sem NUNCA imprimir valores.
// Uso: node scripts/checar_env.mjs        (exit 0 = obrigatórias ok e sem erro de regra)
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const caminho = resolve(raiz, '.env');

if (!existsSync(caminho)) {
  console.error('ERRO: .env não encontrado na raiz do projeto.');
  process.exit(2);
}

// ---------- leitura (sem dependências) ----------
const env = {};
for (const linha of readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n').split('\n')) {
  const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
  if (!m) continue; // comentários e linhas em branco (inclui "#CHAVE=" comentada)
  let v = m[2];
  const aspas = v.trim().match(/^(["'])(.*?)\1(\s+#.*)?$/);
  v = aspas ? aspas[2] : v.replace(/\s+#.*$/, '').trim();
  env[m[1]] = v;
}

// ---------- catálogo de variáveis ----------
const OBRIGATORIA = 'OBRIGATÓRIA v01';
const FUTURA = 'FUTURA — Etapa 03';
const CONDICIONAL = 'CONDICIONAL';
const catalogo = {
  APP_NOME: OBRIGATORIA, APP_AMBIENTE: OBRIGATORIA, APP_URL: OBRIGATORIA, FUSO_HORARIO: OBRIGATORIA,
  VITE_APP_NOME: OBRIGATORIA, VITE_APP_URL: OBRIGATORIA,
  LLM_TETO_MENSAL_BRL: OBRIGATORIA, LLM_ALERTA_EM_PERCENTUAL: OBRIGATORIA,
  HOSTGATOR_DOMINIO: OBRIGATORIA, HOSTGATOR_FTP_HOST: OBRIGATORIA, HOSTGATOR_FTP_USER: OBRIGATORIA,
  HOSTGATOR_FTP_PASS: OBRIGATORIA, HOSTGATOR_FTP_PORT: OBRIGATORIA, HOSTGATOR_FTP_TLS: OBRIGATORIA,
  HOSTGATOR_REMOTE_DIR: OBRIGATORIA,
  SMOKE_BASIC_USER: OBRIGATORIA, SMOKE_BASIC_PASS: OBRIGATORIA,
  VITE_OPENROUTER_API_NAME: FUTURA, VITE_OPENROUTER_API_KEY: FUTURA, VITE_OPENROUTER_MODELO_PADRAO: FUTURA,
  VITE_LLM_LIMITE_DIARIO_FREE: FUTURA, BACKUP_LIMITE_MAX: FUTURA, BACKUP_DIR_SERVIDOR: FUTURA,
  CPANEL_DIRETORIO: CONDICIONAL, LOG_NIVEL: CONDICIONAL, SMOKE_BASIC_NOME: CONDICIONAL,
};
// Nomes que não devem mais existir (Drive descartado; FTP_* renomeado para HOSTGATOR_*).
const obsoleta = /^(VITE_GOOGLE_\w+|GOOGLE_\w+|FTP_(HOST|USER|PASS|PORT|TLS|DIR))$/;

// ---------- helpers ----------
const placeholder = (v) => v === '' || /\[[^\]]*\]|\.\.\.|^sk-or-v1-\.*$|^(troque|change|xxx)/i.test(v);
const numero = (v) => (v !== '' && Number.isFinite(Number(v)) ? Number(v) : NaN);

const erros = [];
const avisos = [];

// ---------- status por variável ----------
const porStatus = { [OBRIGATORIA]: [], [FUTURA]: [], [CONDICIONAL]: [] };
const linhas = [];
for (const [chave, status] of Object.entries(catalogo)) {
  const presente = chave in env;
  const pronta = presente && !placeholder(env[chave]);
  const estado = !presente ? 'AUSENTE' : pronta ? 'ok' : 'PLACEHOLDER/VAZIA';
  porStatus[status].push({ chave, pronta });
  linhas.push(`  [${status.padEnd(17)}] ${chave.padEnd(32)} ${estado}`);
}
console.log('Variáveis do .env (valores nunca são exibidos):');
console.log(linhas.join('\n'));

// ---------- regras de valor (só as preenchidas) ----------
const ok = (k) => k in env && !placeholder(env[k]);
const regra = (k, teste, msg, nivel = erros) => { if (ok(k) && !teste(env[k])) nivel.push(`${k}: ${msg}`); };

regra('APP_AMBIENTE', (v) => ['homologacao', 'producao', 'desenvolvimento'].includes(v),
  'use homologacao | producao | desenvolvimento (docs/01: homologação na hospedagem de Max)', avisos);
regra('APP_URL', (v) => /^https:\/\//.test(v) || /^http:\/\/localhost/.test(v), 'deve começar com https://');
regra('VITE_APP_URL', (v) => /^https:\/\//.test(v) || /^http:\/\/localhost/.test(v), 'deve começar com https://');
if (ok('APP_URL') && ok('VITE_APP_URL') && env.APP_URL.replace(/\/$/, '') !== env.VITE_APP_URL.replace(/\/$/, '')) {
  avisos.push('APP_URL e VITE_APP_URL diferem (esperado o mesmo endereço)');
}
regra('HOSTGATOR_FTP_PORT', (v) => Number.isInteger(numero(v)) && numero(v) > 0 && numero(v) < 65536, 'porta inválida');
regra('HOSTGATOR_FTP_TLS', (v) => ['true', 'false', '1', '0', 'explicit', 'implicit'].includes(v.toLowerCase()),
  'use true | false | explicit | implicit');
regra('HOSTGATOR_FTP_TLS', (v) => !['false', '0'].includes(v.toLowerCase()),
  'TLS desligado: o build carrega dados sigilosos da Lux (docs/05) — manter ligado', avisos);
regra('HOSTGATOR_FTP_HOST', (v) => !/^ftp\./i.test(v),
  'começa com "ftp." — se o domínio está atrás de CDN/Cloudflare o FTP expira; use o host real do servidor (instrucoes §6)', avisos);
regra('HOSTGATOR_REMOTE_DIR', (v) => v.startsWith('/'), 'deve começar com "/"');
regra('LLM_TETO_MENSAL_BRL', (v) => numero(v) >= 0 && numero(v) <= 10000, 'número entre 0 e 10000');
regra('LLM_ALERTA_EM_PERCENTUAL', (v) => numero(v) >= 1 && numero(v) <= 100, 'número entre 1 e 100');
regra('VITE_LLM_LIMITE_DIARIO_FREE', (v) => Number.isInteger(numero(v)) && numero(v) >= 0, 'inteiro >= 0');
regra('BACKUP_LIMITE_MAX', (v) => Number.isInteger(numero(v)) && numero(v) >= 1 && numero(v) <= 10, 'inteiro de 1 a 10 (teto rígido = 10)');
regra('VITE_OPENROUTER_API_KEY', (v) => v.startsWith('sk-or-v1-'), 'não parece uma chave OpenRouter (sk-or-v1-...)', avisos);
if (ok('LLM_TETO_MENSAL_BRL') && numero(env.LLM_TETO_MENSAL_BRL) > 0) {
  avisos.push('LLM_TETO_MENSAL_BRL > 0: o padrão do projeto é R$ 0 (circuit breaker); só altere com aprovação de Max');
}

// ---------- segurança: nada secreto com prefixo VITE_ ----------
const segredos = ['HOSTGATOR_FTP_PASS', 'HOSTGATOR_FTP_USER', 'SMOKE_BASIC_PASS', 'SMOKE_BASIC_USER']
  .filter(ok).map((k) => env[k]);
for (const [k, v] of Object.entries(env)) {
  if (k.startsWith('VITE_') && v && segredos.includes(v)) erros.push(`${k}: repete um segredo de deploy — VITE_ vai para o bundle público!`);
  if (/^VITE_.*(FTP|SMOKE|PASS|SECRET)/i.test(k)) erros.push(`${k}: nome sugere segredo com prefixo VITE_ (bundle público)`);
}

// ---------- variáveis obsoletas / desconhecidas ----------
for (const k of Object.keys(env)) {
  if (obsoleta.test(k)) avisos.push(`${k}: variável obsoleta (Drive descartado ou renomeada para HOSTGATOR_*) — pode remover do .env`);
  else if (!(k in catalogo)) avisos.push(`${k}: variável desconhecida ao catálogo (scripts/checar_env.mjs)`);
}

// ---------- resumo ----------
const resumo = (s) => `${porStatus[s].filter((x) => x.pronta).length}/${porStatus[s].length}`;
console.log('');
if (avisos.length) console.log('AVISOS:\n' + avisos.map((a) => '  - ' + a).join('\n'));
if (erros.length) console.log('ERROS DE REGRA:\n' + erros.map((a) => '  - ' + a).join('\n'));
const faltam = porStatus[OBRIGATORIA].filter((x) => !x.pronta).map((x) => x.chave);
if (faltam.length) console.log('Obrigatórias pendentes: ' + faltam.join(', '));
const futuras = porStatus[FUTURA].filter((x) => !x.pronta).map((x) => x.chave);
if (futuras.length) console.log('Futuras (Etapa 03) ainda em placeholder — não bloqueiam: ' + futuras.join(', '));
console.log(`FUTURAS Etapa 03: ${resumo(FUTURA)} preenchidas`);
console.log(`OBRIGATÓRIAS v01: ${resumo(OBRIGATORIA)} preenchidas`);
process.exit(faltam.length || erros.length ? 1 : 0);
