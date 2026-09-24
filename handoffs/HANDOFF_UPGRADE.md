# HANDOFF_UPGRADE — Lux Ferramentas Operacionais

_(Modelo — preenchido pelo CODE ao fim da Etapa 02, subetapa 02.12.)_

## Estado atual
MVP v01 (MMO v02 + FPE) no ar (hospedagem particular de Max), protegido e 100% verde. Nova sessão para a Etapa 03 (POP, LLM, XLSX, API PHP de backups + tela `#/versoes`, migração). `CHANGELOG.md` deve conter a entrada `+1.0` do lançamento do MVP.

## Leitura de abertura
1. `CLAUDE.md` · 2. `docs/00_PLANO_E_CRITERIOS.md` (Etapa 03) · 3. `handoffs/instrucoes.md`.

## Regime de autonomia (continua valendo)
Sem novas aprovações. Perguntar a Max só nos 6 casos do `CLAUDE.md` §0, em uma única mensagem.

## O que está funcional (v01) — com a prova
- <funcionalidade> — prova: <comando/URL + resultado>

## Portão 02→03
- `curl` sem senha → `401` · com senha → `200` · `npm test` → `0 failed` · `npm run e2e` → `passed` · `dados:validar` (v08, fichas, bibliotecas) → 3 `OK` · `gitleaks` → `no leaks found` — status: <verde/vermelho>

## Backlog de versionamento herdado
- +0.1: <itens>
- +1.0: <itens>

## Credenciais a providenciar para esta etapa
- `VITE_OPENROUTER_API_KEY`, `VITE_OPENROUTER_MODELO_PADRAO`, `BACKUP_LIMITE_MAX`, `BACKUP_DIR_SERVIDOR` — status: <preenchidas/placeholder>. (Google/OAuth: [OBSOLETA].)

## Dívidas técnicas / riscos conhecidos
- <itens>

## Pendências vigiadas
- <ex.: cota do OpenRouter; PHP/`ZipArchive` no servidor; validação do contratante (Etapa 04) pendente; migração aguardando “aprovado” de Max>

## Candidatos a promoção (seção 7 do instrucoes.md)
- <aprendizados para virar padrão de todos os projetos de Max>

## Regras
- Sessões separadas; ponte = repo + este handoff + `handoffs/instrucoes.md`.
- Toda solução nova continua registrada em `handoffs/instrucoes.md`.

## Primeiro passo sugerido da Etapa 03
- Subetapa 03.1 — tela POP e geração por template (sem LLM).
