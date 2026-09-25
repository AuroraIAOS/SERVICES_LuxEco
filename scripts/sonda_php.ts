// Spike de PHP no servidor (03.5/03.8): envia uma sonda temporária, pede com SMOKE_BASIC_*, imprime o resultado e APAGA a sonda.
// Confirma: PHP >= 8, ZipArchive, usuário autenticado visível ao PHP (REMOTE_USER) e escrita possível fora do docroot.
// Só remove o arquivo que ele mesmo criou. Uso: npx tsx scripts/sonda_php.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Client } from 'basic-ftp';
import { destinoRemoto, lerEnv } from './deploy_lib.ts';

const raiz = resolve(import.meta.dirname, '..');
const env = lerEnv(readFileSync(join(raiz, '.env'), 'utf8'));
const destino = destinoRemoto(env.HOSTGATOR_REMOTE_DIR as string, env.APP_URL as string);
const nome = `sonda_${Date.now().toString(36)}.php`;
const php = `<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$fora = dirname($_SERVER['DOCUMENT_ROOT']);
echo json_encode([
  'php' => PHP_VERSION,
  'php8' => version_compare(PHP_VERSION, '8.0.0', '>='),
  'zip' => class_exists('ZipArchive'),
  'remote_user_visivel' => !empty($_SERVER['REMOTE_USER']) || !empty($_SERVER['REDIRECT_REMOTE_USER']),
  'fora_do_docroot_gravavel' => is_writable($fora),
]);
`;
mkdirSync(join(raiz, '.deploy_backup'), { recursive: true });
const local = join(raiz, '.deploy_backup', nome);
writeFileSync(local, php);

const cliente = new Client(60_000);
let enviado = false;
try {
  await cliente.access({ host: env.HOSTGATOR_FTP_HOST, port: Number(env.HOSTGATOR_FTP_PORT ?? 21), user: env.HOSTGATOR_FTP_USER, password: env.HOSTGATOR_FTP_PASS, secure: true });
  await cliente.uploadFrom(local, `${destino}/${nome}`);
  enviado = true;
  const auth = `Basic ${Buffer.from(`${env.SMOKE_BASIC_USER}:${env.SMOKE_BASIC_PASS}`).toString('base64')}`;
  const r = await fetch(`${env.APP_URL}${nome}`, { headers: { Authorization: auth } });
  console.log(`HTTP ${r.status}`, await r.text());
} finally {
  if (enviado) await cliente.remove(`${destino}/${nome}`).then(() => console.log('sonda removida do servidor'));
  cliente.close();
}
