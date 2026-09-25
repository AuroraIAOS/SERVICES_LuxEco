// Deploy do dist/ por FTPS (basic-ftp) para a subpasta do app na hospedagem. Lê o destino SÓ do .env (a migração da 03.8 não
// muda código). Nunca imprime valores do .env. Regras (handoffs/instrucoes.md §4 e §6):
//  · canal de dados sempre sob TLS (o dist embute conteúdo sigiloso da Lux); falhou → reenvia sob TLS, nunca em claro;
//  · não apaga nada no servidor; não toca no .htaccess do pai (senha) nem em BACKUP_DIR_SERVIDOR nem em api/config.php;
//  · .htaccess da subpasta: baixa, guarda cópia, MESCLA (nosso bloco no topo) e confere que a senha não sumiu;
//  · confere tamanho local × remoto de cada arquivo; prova 401 sem senha e 200 com SMOKE_BASIC_*.
// Uso: npm run deploy            (publica)
//      npm run deploy -- --sondar (só lê: conecta, lista, checa proteção; não envia nada)
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { Client } from 'basic-ftp';
import { destinoRemoto, divergencias, gerarConfigPhp, lerEnv, mesclarHtaccess, temSenha } from './deploy_lib.ts';

const RAIZ = resolve(import.meta.dirname, '..');
const DIST = join(RAIZ, 'dist');
const COPIAS = join(RAIZ, '.deploy_backup');
const sondar = process.argv.includes('--sondar');
const falhar = (msg: string): never => {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
};

const env = lerEnv(readFileSync(join(RAIZ, '.env'), 'utf8'));
for (const k of ['APP_URL', 'HOSTGATOR_FTP_HOST', 'HOSTGATOR_FTP_USER', 'HOSTGATOR_FTP_PASS', 'HOSTGATOR_REMOTE_DIR', 'SMOKE_BASIC_USER', 'SMOKE_BASIC_PASS']) {
  if (!env[k]) falhar(`variável ${k} ausente no .env (valores nunca são impressos).`);
}
const appUrl = env.APP_URL as string;
if (!appUrl.startsWith('https://')) falhar('APP_URL precisa ser https.');
if (/^ftp\./i.test(env.HOSTGATOR_FTP_HOST as string)) falhar('HOSTGATOR_FTP_HOST parece ftp.<dominio>: use o host real do servidor (instrucoes.md §6).');
if (env.HOSTGATOR_FTP_TLS === 'false') falhar('HOSTGATOR_FTP_TLS=false recusado: os dados da Lux nunca vão em claro.');
const destino = destinoRemoto(env.HOSTGATOR_REMOTE_DIR as string, appUrl);
const configPhp = gerarConfigPhp(env); // valida BACKUP_* antes de conectar; a pasta tem de ficar fora da raiz web
const basic = `Basic ${Buffer.from(`${env.SMOKE_BASIC_USER}:${env.SMOKE_BASIC_PASS}`).toString('base64')}`;

const http = async (url: string, comSenha: boolean) => (await fetch(url, { redirect: 'manual', headers: comSenha ? { Authorization: basic } : {} })).status;

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));
}
const posix = (p: string) => p.split('\\').join('/');

async function main() {
  if (!sondar) {
    if (!existsSync(join(DIST, 'index.html'))) falhar('dist/index.html não existe: rode `npm run build` antes.');
    // nenhum segredo no bundle (nem o nome das variáveis, nem o valor)
    for (const f of arquivos(DIST)) {
      const t = readFileSync(f, 'utf8');
      if (/HOSTGATOR_FTP_PASS|SMOKE_BASIC/.test(t) || t.includes(env.HOSTGATOR_FTP_PASS as string) || t.includes(env.SMOKE_BASIC_PASS as string)) falhar(`segredo encontrado em ${relative(DIST, f)}; deploy abortado.`);
    }
  }

  // A proteção do diretório tem de estar ativa ANTES de publicar (caso contrário só uma página vazia — e isso é decisão de Max).
  const semSenhaAntes = await http(appUrl, false);
  console.log(`proteção antes: sem senha → ${semSenhaAntes}`);
  if (semSenhaAntes !== 401) falhar(`a URL do app respondeu ${semSenhaAntes} sem senha (esperado 401): proteção do cPanel não está ativa. Nada foi enviado.`);

  const cliente = new Client(60_000);
  try {
    await cliente.access({ host: env.HOSTGATOR_FTP_HOST, port: Number(env.HOSTGATOR_FTP_PORT ?? 21), user: env.HOSTGATOR_FTP_USER, password: env.HOSTGATOR_FTP_PASS, secure: true });
    console.log(`FTPS conectado (TLS). destino remoto: ${destino}`);

    const raiz = await cliente.list('/');
    const nomesRaiz = raiz.map((i) => i.name);
    console.log(`raiz do FTP: ${nomesRaiz.length} itens${nomesRaiz.includes('.htaccess') ? ' (com .htaccess do pai — não será tocado)' : ''}`);
    let existe = true;
    try {
      await cliente.cd(destino);
    } catch {
      existe = false;
    }
    await cliente.cd('/');
    console.log(`subpasta do app: ${existe ? 'existe' : 'ainda não existe'}`);
    if (sondar) {
      console.log('modo --sondar: nada foi enviado.');
      return;
    }

    await cliente.ensureDir(destino);
    await cliente.cd('/');

    // .htaccess da subpasta: baixa, guarda cópia e mescla
    let remoto: string | null = null;
    const nomesApp = (await cliente.list(destino)).map((i) => i.name);
    mkdirSync(COPIAS, { recursive: true });
    if (nomesApp.includes('.htaccess')) {
      const cache = join(COPIAS, 'htaccess_remoto_atual.tmp');
      await cliente.downloadTo(cache, `${destino}/.htaccess`);
      remoto = readFileSync(cache, 'utf8');
      const carimbo = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      writeFileSync(join(COPIAS, `htaccess_${carimbo}.bak`), remoto);
      console.log(`.htaccess remoto guardado em .deploy_backup/htaccess_${carimbo}.bak`);
    }
    const nosso = readFileSync(join(DIST, '.htaccess'), 'utf8');
    const mesclado = mesclarHtaccess(remoto, nosso);
    if (remoto && temSenha(remoto) && !temSenha(mesclado)) falhar('a mescla perderia a proteção por senha do .htaccess remoto. Nada foi enviado.');
    const mescladoLocal = join(COPIAS, 'htaccess_para_enviar.tmp');
    writeFileSync(mescladoLocal, mesclado);

    // envio (1 conexão; 3 tentativas por arquivo, sempre sob TLS)
    const locais: Record<string, number> = {};
    const configLocal = join(COPIAS, 'config_php_para_enviar.tmp');
    writeFileSync(configLocal, configPhp);
    const envios = [
      ...arquivos(DIST).map((f) => ({ origem: basename(f) === '.htaccess' && f === join(DIST, '.htaccess') ? mescladoLocal : f, rel: posix(relative(DIST, f)) })),
      { origem: configLocal, rel: 'api/config.php' }, // gerado do .env: nunca está no dist nem no Git
    ];
    for (const { origem, rel } of envios) {
      locais[rel] = statSync(origem).size;
      const remotoPath = `${destino}/${rel}`;
      await cliente.ensureDir(remotoPath.slice(0, remotoPath.lastIndexOf('/')));
      await cliente.cd('/');
      for (let t = 1; ; t++) {
        try {
          await cliente.uploadFrom(origem, remotoPath);
          break;
        } catch (e) {
          if (t === 3) throw new Error(`falha ao enviar ${rel} após 3 tentativas sob TLS (${(e as Error).message}). Não use dados em claro sem aprovação de Max.`);
          console.log(`  ${rel}: tentativa ${t} falhou, reenviando sob TLS…`);
        }
      }
      console.log(`  enviado ${rel} (${locais[rel]} B)`);
    }

    // conferência de tamanho
    const remotos: Record<string, number | null> = {};
    for (const rel of Object.keys(locais)) remotos[rel] = await cliente.size(`${destino}/${rel}`).catch(() => null);
    const div = divergencias(locais, remotos);
    console.log(`${Object.keys(locais).length} arquivos conferidos: ${div.length} divergência(s) de tamanho`);
    for (const d of div) console.log(`  ${d.arquivo}: local ${d.local} × remoto ${d.remoto ?? 'ausente'}`);
    if (div.length) falhar('divergência de tamanho local × remoto.');

    // provas HTTP
    const sem = await http(appUrl, false);
    const com = await http(appUrl, true);
    console.log(`prova: sem senha → ${sem}; com SMOKE_BASIC → ${com}`);
    if (sem !== 401) {
      if (remoto !== null) {
        await cliente.uploadFrom(join(COPIAS, 'htaccess_remoto_atual.tmp'), `${destino}/.htaccess`);
        console.error('.htaccess anterior restaurado.');
      }
      falhar(`sem senha voltou ${sem} (esperado 401): proteção perdida.`);
    }
    if (com !== 200) falhar(`com senha voltou ${com} (esperado 200).`);
    const http80 = (await fetch(appUrl.replace('https://', 'http://'), { redirect: 'manual' })).status;
    console.log(`http:// → ${http80} (esperado 301 ou 401)`);
    // a API de backups: sem senha → 401; com senha → 200 (JSON); a configuração gerada nunca é lida direto
    const api = `${appUrl}api/backups.php?acao=listar`;
    const apiSem = await http(api, false);
    const apiCom = await http(api, true);
    const cfgDireto = await http(`${appUrl}api/config.php`, true);
    console.log(`api: sem senha → ${apiSem}; com SMOKE_BASIC → ${apiCom}; config.php direto → ${cfgDireto}`);
    if (apiSem !== 401) falhar(`a API respondeu ${apiSem} sem senha (esperado 401).`);
    if (apiCom !== 200) falhar(`a API respondeu ${apiCom} com senha (esperado 200).`);
    if (![200, 403, 404].includes(cfgDireto) || (cfgDireto === 200 && (await (await fetch(`${appUrl}api/config.php`, { headers: { Authorization: basic } })).text()).includes('diretorio'))) falhar('api/config.php está legível pela web.');
    console.log('DEPLOY OK');
  } finally {
    cliente.close();
  }
}

main().catch((e: unknown) => falhar((e as Error).message));
