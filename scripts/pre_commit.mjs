#!/usr/bin/env node
// Pré-commit (01.6): 1) bloqueia arquivos que nunca podem ir ao Git; 2) bloqueia padrão de CPF/CNPJ nas linhas
// adicionadas; 3) roda `gitleaks protect --staged`. Nunca imprime o conteúdo encontrado, só onde.
import { spawnSync } from 'node:child_process';

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });
const erros = [];

const staged = git('diff', '--cached', '--name-only', '--diff-filter=ACMR').stdout.split('\n').filter(Boolean);
const proibido = /^(\.env(\..*)?|referencias_privadas\/.*|screenshots\/.*)$|\.(pem|key|p12|pfx)$|token.*\.json$|service-?account.*\.json$/i;
for (const f of staged) if (proibido.test(f)) erros.push(`arquivo proibido no commit: ${f}`);

// Dados pessoais do contrato (CPF/CNPJ) não podem entrar nas linhas adicionadas (exceto lockfile).
const dif = git('diff', '--cached', '-U0', '--diff-filter=ACMR', '--', '.', ':!package-lock.json').stdout;
let arquivo = '';
for (const linha of dif.split('\n')) {
  if (linha.startsWith('+++ b/')) arquivo = linha.slice(6);
  else if (linha.startsWith('+') && /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/.test(linha)) {
    erros.push(`padrão de CPF/CNPJ em linha adicionada: ${arquivo} (o contrato fica fora do Git)`);
  }
}

const gl = spawnSync('gitleaks', ['protect', '--staged', '--no-banner', '--redact'], { encoding: 'utf8' });
if (gl.error) erros.push('gitleaks não encontrado no PATH — instale (winget install Gitleaks.Gitleaks) antes de commitar');
else if (gl.status !== 0) erros.push('gitleaks encontrou possível segredo:\n' + (gl.stdout + gl.stderr).trim());

if (erros.length) {
  console.error('\n❌ PRÉ-COMMIT BLOQUEADO:\n - ' + erros.join('\n - ') + '\n');
  process.exit(1);
}
console.log('✔ pré-commit: sem segredos, sem arquivos proibidos, sem CPF/CNPJ.');
