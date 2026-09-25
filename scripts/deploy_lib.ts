// Partes puras do deploy (sem rede): leitura do .env, destino remoto, mescla do .htaccess e conferência de tamanhos.
// Nunca imprime valores do .env.
export const MARCA_INICIO = '# BEGIN LUX APP';
export const MARCA_FIM = '# END LUX APP';

export function lerEnv(texto: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(linha);
    if (!m) continue;
    const v = m[2] ?? '';
    const aspas = /^(["'])(.*?)\1(\s+#.*)?$/.exec(v.trim());
    env[m[1] as string] = aspas ? (aspas[2] as string) : v.replace(/\s+#.*$/, '').trim();
  }
  return env;
}

/**
 * Pasta remota do app: `HOSTGATOR_REMOTE_DIR` + caminho da `APP_URL` (ex.: "/" + "/intelligence/" → "/intelligence").
 * Recusa a raiz: o app vive numa subpasta, nunca no docroot do pai (onde mora a senha do diretório).
 */
export function destinoRemoto(remoteDir: string, appUrl: string): string {
  const partes = [...remoteDir.split('/'), ...new URL(appUrl).pathname.split('/')].filter((p) => p !== '' && p !== '.');
  if (partes.includes('..')) throw new Error('Destino com ".." recusado.');
  if (partes.length === 0 || new URL(appUrl).pathname.replace(/\//g, '') === '') {
    throw new Error('APP_URL precisa apontar para uma subpasta (ex.: /intelligence/): o deploy não publica no docroot do pai.');
  }
  return `/${partes.join('/')}`;
}

const remove = (texto: string) => {
  const i = texto.indexOf(MARCA_INICIO);
  const f = texto.indexOf(MARCA_FIM);
  if (i === -1 || f === -1 || f < i) return texto;
  return texto.slice(0, i) + texto.slice(texto.indexOf('\n', f) === -1 ? texto.length : texto.indexOf('\n', f) + 1);
};

/**
 * Nosso bloco entra NO TOPO (o HTTPS antes de tudo); o que já existia no .htaccess remoto (proteção por senha do cPanel,
 * handler de PHP, blocos “# BEGIN … # END …” de outros programas) continua intacto logo abaixo. Idempotente.
 */
export function mesclarHtaccess(remoto: string | null, nosso: string): string {
  const inicio = nosso.indexOf(MARCA_INICIO);
  const fim = nosso.indexOf(MARCA_FIM);
  if (inicio === -1 || fim === -1) throw new Error('public/.htaccess sem os marcadores BEGIN/END LUX APP.');
  const bloco = `${nosso.slice(inicio, nosso.indexOf('\n', fim) === -1 ? nosso.length : nosso.indexOf('\n', fim) + 1).trimEnd()}\n`;
  const resto = remoto ? remove(remoto.replace(/\r\n/g, '\n')).replace(/^\n+/, '') : '';
  return resto.trim() === '' ? bloco : `${bloco}\n${resto}`;
}

/** Linhas de proteção que nunca podem sumir do .htaccess remoto. */
export const DIRETIVAS_DE_SENHA = /^\s*(AuthType|AuthName|AuthUserFile|AuthGroupFile|Require\s+valid-user)\b/im;
export const temSenha = (htaccess: string) => DIRETIVAS_DE_SENHA.test(htaccess);

export interface Divergencia {
  arquivo: string;
  local: number;
  remoto: number | null;
}
export function divergencias(locais: Record<string, number>, remotos: Record<string, number | null>): Divergencia[] {
  return Object.entries(locais)
    .filter(([arq, tam]) => remotos[arq] !== tam)
    .map(([arquivo, local]) => ({ arquivo, local, remoto: remotos[arquivo] ?? null }));
}
