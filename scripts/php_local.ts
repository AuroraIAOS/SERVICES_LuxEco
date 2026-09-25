// Localiza o PHP de desenvolvimento (03.5): o portátil de tools_locais/php (npm run php:preparar) ou um `php` do PATH.
// Sem PHP, os testes da API FALHAM com instrução clara — nunca passam “pulados”.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const PORTATIL = join(RAIZ, 'tools_locais', 'php');

export interface PhpLocal {
  /** executável do servidor embutido (php -S). */
  php: string;
  /** executável CGI (uma requisição por processo: serve para provar concorrência de verdade). */
  cgi: string;
  /** argumentos que apontam o php.ini do portátil (vazio se for o php do PATH). */
  ini: string[];
}

export function acharPhp(): PhpLocal {
  const exe = process.platform === 'win32' ? 'php.exe' : 'php';
  const cgiExe = process.platform === 'win32' ? 'php-cgi.exe' : 'php-cgi';
  if (existsSync(join(PORTATIL, exe)) && existsSync(join(PORTATIL, 'php.ini'))) {
    return { php: join(PORTATIL, exe), cgi: join(PORTATIL, cgiExe), ini: ['-c', join(PORTATIL, 'php.ini')] };
  }
  const r = spawnSync('php', ['-v'], { encoding: 'utf8' });
  if (r.status === 0) return { php: 'php', cgi: 'php-cgi', ini: [] };
  throw new Error('PHP não encontrado. Rode `npm run php:preparar` (baixa um PHP portátil para tools_locais/) ou instale o php ≥ 8.1 com zip e mbstring.');
}
