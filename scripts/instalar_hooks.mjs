#!/usr/bin/env node
// Aponta o Git para .githooks/ (roda automaticamente no `npm install` via "prepare").
import { spawnSync } from 'node:child_process';
const r = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { encoding: 'utf8' });
if (r.status !== 0) console.warn('Aviso: não foi possível configurar core.hooksPath (fora de um repositório Git?).');
else console.log('hooks: core.hooksPath = .githooks');
