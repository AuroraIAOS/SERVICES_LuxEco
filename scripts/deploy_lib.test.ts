// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { destinoRemoto, divergencias, lerEnv, mesclarHtaccess, temSenha } from './deploy_lib.ts';

const nosso = readFileSync(resolve(import.meta.dirname, '../public/.htaccess'), 'utf8');
const senha = 'AuthType Basic\nAuthName "Restrito"\nAuthUserFile /home/x/.htpasswds/pasta/passwd\nrequire valid-user\n';

describe('destinoRemoto', () => {
  it('junta a pasta do FTP com o caminho da APP_URL', () => {
    expect(destinoRemoto('/', 'https://lux.exemplo.com/intelligence/')).toBe('/intelligence');
    expect(destinoRemoto('/public_html/', 'https://x.com/app/v1')).toBe('/public_html/app/v1');
  });
  it('recusa a raiz do domínio e ".."', () => {
    expect(() => destinoRemoto('/', 'https://lux.exemplo.com/')).toThrow(/subpasta/);
    expect(() => destinoRemoto('/../x', 'https://a.com/p/')).toThrow(/\.\./);
  });
});

describe('mesclarHtaccess', () => {
  it('sem .htaccess remoto: só o nosso bloco', () => {
    const m = mesclarHtaccess(null, nosso);
    expect(m.startsWith('# BEGIN LUX APP')).toBe(true);
    expect(m).toContain('RewriteRule');
  });
  it('preserva a senha e os blocos de outros programas; nosso bloco fica no topo', () => {
    const remoto = `${senha}\n# BEGIN WordPress\nRewriteRule . /index.php\n# END WordPress\n`;
    const m = mesclarHtaccess(remoto, nosso);
    expect(m.indexOf('# BEGIN LUX APP')).toBe(0);
    expect(temSenha(m)).toBe(true);
    expect(m).toContain('# BEGIN WordPress');
    expect(m.indexOf('RewriteRule ^ https')).toBeLessThan(m.indexOf('AuthType'));
  });
  it('é idempotente e troca o bloco antigo em vez de duplicar', () => {
    const uma = mesclarHtaccess(senha, nosso);
    const duas = mesclarHtaccess(uma, nosso);
    expect(duas).toBe(uma);
    expect((duas.match(/# BEGIN LUX APP/g) ?? []).length).toBe(1);
    const antigo = uma.replace('max-age=86400', 'max-age=1');
    expect(mesclarHtaccess(antigo, nosso)).toBe(uma);
  });
  it('recusa um .htaccess nosso sem marcadores', () => {
    expect(() => mesclarHtaccess(null, 'RewriteEngine On')).toThrow(/marcadores/);
  });
  it('o nosso .htaccess: HTTPS primeiro, HSTS curto sem includeSubDomains, sem fallback de SPA', () => {
    expect(nosso.indexOf('RewriteRule')).toBeLessThan(nosso.indexOf('Header'));
    expect(nosso).toContain('max-age=86400');
    expect(nosso).not.toMatch(/includeSubDomains|index\.html \[|FallbackResource/);
    expect(nosso).toContain('no-cache');
    expect(nosso).toContain('immutable');
    expect(nosso).toContain('no-store');
  });
});

describe('divergencias e lerEnv', () => {
  it('acusa tamanho diferente e arquivo ausente', () => {
    expect(divergencias({ a: 1, b: 2, c: 3 }, { a: 1, b: 9, c: null })).toEqual([
      { arquivo: 'b', local: 2, remoto: 9 },
      { arquivo: 'c', local: 3, remoto: null },
    ]);
    expect(divergencias({ a: 1 }, { a: 1 })).toEqual([]);
  });
  it('lê KEY=valor, aspas e comentários; ignora linha comentada', () => {
    expect(lerEnv('A=1\n# B=2\nC="x y" # nota\nD=z # c\r\n')).toEqual({ A: '1', C: 'x y', D: 'z' });
  });
});
