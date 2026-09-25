// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { destinoRemoto, divergencias, lerEnv, mesclarHtaccess, temSenha, gerarConfigPhp, pastaDeBackups } from './deploy_lib.ts';

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

describe('api/config.php gerado do .env (03.5)', () => {
  const base = { BACKUP_DIR_SERVIDOR: '../lux_backups', BACKUP_LIMITE_MAX: '10', FUSO_HORARIO: 'America/Sao_Paulo', CPANEL_DIRETORIO: '/home2/conta/lux.exemplo.com' };

  it('relativo é resolvido a partir do docroot e fica FORA dele', () => {
    expect(pastaDeBackups(base)).toBe('/home2/conta/lux_backups');
    expect(pastaDeBackups({ ...base, BACKUP_DIR_SERVIDOR: '/home2/conta/lux_backups/' })).toBe('/home2/conta/lux_backups');
  });

  it.each([
    ['dentro do docroot (relativo)', { BACKUP_DIR_SERVIDOR: 'backups' }],
    ['dentro do docroot (absoluto)', { BACKUP_DIR_SERVIDOR: '/home2/conta/lux.exemplo.com/intelligence/backups' }],
    ['o próprio docroot', { BACKUP_DIR_SERVIDOR: '/home2/conta/lux.exemplo.com' }],
    ['raiz do disco', { BACKUP_DIR_SERVIDOR: '/' }],
    ['vazio', { BACKUP_DIR_SERVIDOR: '' }],
    ['caracteres perigosos', { BACKUP_DIR_SERVIDOR: "/home2/conta/x';system('id');'" }],
    ['espaço', { BACKUP_DIR_SERVIDOR: '/home2/conta/meus backups' }],
    ['relativo sem docroot absoluto', { CPANEL_DIRETORIO: 'lux' }],
  ])('recusa pasta %s', (_nome, mudar) => {
    expect(() => pastaDeBackups({ ...base, ...mudar })).toThrow();
  });

  it('gera um PHP com só pasta, limite e fuso; nenhum segredo do .env entra', () => {
    const php = gerarConfigPhp({ ...base, HOSTGATOR_FTP_PASS: 'segredo-ftp', SMOKE_BASIC_PASS: 'segredo-smoke', VITE_OPENROUTER_API_KEY: 'sk-or-v1-x' });
    expect(php).toContain("'diretorio' => '/home2/conta/lux_backups'");
    expect(php).toContain("'limite' => 10");
    expect(php).toContain("'fuso' => 'America/Sao_Paulo'");
    expect(php).not.toMatch(/segredo|sk-or|modo_teste/);
  });

  it('o limite tem teto de 10 e piso de 1; fuso inválido é recusado', () => {
    expect(gerarConfigPhp({ ...base, BACKUP_LIMITE_MAX: '3' })).toContain("'limite' => 3");
    for (const ruim of ['11', '0', '-1', 'dez', '2.5']) expect(() => gerarConfigPhp({ ...base, BACKUP_LIMITE_MAX: ruim }), ruim).toThrow(/1 a 10/);
    expect(() => gerarConfigPhp({ ...base, FUSO_HORARIO: "x'; echo 1; //" })).toThrow(/FUSO_HORARIO/);
  });
});
