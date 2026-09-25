// Prepara um PHP portátil SÓ para testar a API de backups na máquina de desenvolvimento (03.5). Não instala nada no sistema:
// baixa o zip oficial do PHP 8.3 (Windows, NTS), confere o SHA-256 publicado pelo próprio php.net e extrai em tools_locais/php
// (pasta ignorada pelo Git). Em outros sistemas, use um `php` (≥ 8.1 com zip e mbstring) que já esteja no PATH.
// Uso: npm run php:preparar
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const DESTINO = join(RAIZ, 'tools_locais', 'php');
const LISTA = 'https://downloads.php.net/~windows/releases/releases.json';
const BASE = 'https://downloads.php.net/~windows/releases/';

const funciona = (php) => {
  const r = spawnSync(php, ['-r', 'exit(class_exists("ZipArchive") && function_exists("mb_substr") && version_compare(PHP_VERSION, "8.1.0", ">=") ? 0 : 1);'], { encoding: 'utf8' });
  return r.status === 0;
};

if (funciona('php')) {
  console.log('OK: já há um php (≥ 8.1, com zip e mbstring) no PATH.');
  process.exit(0);
}
if (process.platform !== 'win32') {
  console.log('ERRO: instale o php (≥ 8.1, com zip e mbstring) pelo gerenciador de pacotes do seu sistema.');
  process.exit(1);
}
const exe = join(DESTINO, 'php.exe');
if (existsSync(exe) && funciona(exe)) {
  console.log(`OK: PHP portátil já preparado em tools_locais/php.`);
  process.exit(0);
}

const lista = await (await fetch(LISTA, { redirect: 'follow' })).json();
const versao = lista['8.3'];
const pacote = Object.entries(versao).find(([nome]) => /^nts-v[cs]\d+-x64$/.test(nome))?.[1]?.zip;
if (!pacote) {
  console.log('ERRO: não achei o pacote PHP 8.3 NTS x64 na lista oficial.');
  process.exit(1);
}
console.log(`baixando ${pacote.path} (${pacote.size})…`);
const zip = Buffer.from(await (await fetch(BASE + pacote.path)).arrayBuffer());
const hash = createHash('sha256').update(zip).digest('hex');
if (hash !== pacote.sha256) {
  console.log(`ERRO: SHA-256 não confere (esperado ${pacote.sha256}, veio ${hash}). Nada foi extraído.`);
  process.exit(1);
}
rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });
const arquivoZip = join(DESTINO, '..', 'php.zip');
writeFileSync(arquivoZip, zip);
const ext = spawnSync('tar', ['-xf', arquivoZip, '-C', DESTINO], { encoding: 'utf8' });
rmSync(arquivoZip, { force: true });
if (ext.status !== 0) {
  console.log(`ERRO: não consegui extrair (${ext.stderr.trim()}).`);
  process.exit(1);
}
writeFileSync(join(DESTINO, 'php.ini'), 'extension_dir="ext"\nextension=zip\nextension=mbstring\nextension=fileinfo\nupload_max_filesize=8M\npost_max_size=8M\nmemory_limit=256M\ndisplay_errors=Off\nlog_errors=On\n');
if (!funciona(exe)) {
  console.log('ERRO: o PHP extraído não tem zip/mbstring.');
  process.exit(1);
}
console.log(`OK: PHP ${readFileSync(join(DESTINO, 'php.ini'), 'utf8').length > 0 ? 'portátil' : ''} pronto em tools_locais/php (${versao.version}).`);
