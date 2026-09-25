// Sobe uma CÓPIA de public/api/backups.php com PHP de verdade (servidor embutido) e uma pasta de backups temporária.
// Usado pelo portão adversarial, pelo teste que valida o HTML gerado pelo app contra o PHP e pelo e2e da tela “Versões salvas”.
// `modo_teste`: o PHP aceita o Authorization enviado pelo cliente (em produção só o REMOTE_USER do servidor web autentica).
import { spawn, type ChildProcess } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { acharPhp } from './php_local.ts';

const RAIZ = resolve(import.meta.dirname, '..');
export const PHP = acharPhp();
export const AUTH_TESTE = `Basic ${Buffer.from('teste:teste').toString('base64')}`;

export interface AmbienteApi {
  /** URL completa do backups.php. */
  url: string;
  /** pasta dos backups (fora da raiz web). */
  dir: string;
  docroot: string;
  parar: () => void;
}

const portaLivre = () =>
  new Promise<number>((ok) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => ok(p));
    });
  });

export async function subirApi(o: { limite?: number; producao?: boolean; semConfig?: boolean } = {}): Promise<AmbienteApi> {
  const base = mkdtempSync(join(tmpdir(), 'lux_api_'));
  const docroot = join(base, 'web');
  const dir = join(base, 'lux_backups');
  mkdirSync(docroot);
  copyFileSync(join(RAIZ, 'public/api/backups.php'), join(docroot, 'backups.php'));
  if (!o.semConfig) writeFileSync(join(docroot, 'config.php'), `<?php return ['diretorio' => ${JSON.stringify(dir)}, 'limite' => ${o.limite ?? 10}, ${o.producao ? '' : "'modo_teste' => true,"} 'fuso' => 'America/Sao_Paulo'];\n`);
  const roteador = join(docroot, 'roteador.php');
  writeFileSync(roteador, "<?php\nif (isset($_SERVER['HTTP_X_TESTE_REMOTE_USER'])) { $_SERVER['REMOTE_USER'] = $_SERVER['HTTP_X_TESTE_REMOTE_USER']; }\nrequire __DIR__ . '/backups.php';\n");
  const porta = await portaLivre();
  const filho: ChildProcess = spawn(PHP.php, [...PHP.ini, '-S', `127.0.0.1:${porta}`, '-t', docroot, roteador], { cwd: docroot, stdio: 'ignore' });
  const url = `http://127.0.0.1:${porta}/backups.php`;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(url);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  return {
    url,
    dir,
    docroot,
    parar: () => {
      filho.kill();
      try {
        rmSync(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      } catch {
        // Windows ainda segurando a pasta: é só a pasta temporária
      }
    },
  };
}
