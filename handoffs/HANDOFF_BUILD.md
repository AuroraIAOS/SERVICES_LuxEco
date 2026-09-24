# HANDOFF_BUILD — Lux Ferramentas Operacionais

_(Modelo — preenchido pelo CODE ao fim da Etapa 01, subetapa 01.7.)_

## Estado atual
Fundação concluída e versionada. Nova sessão para construir o MVP (MMO v02 + FPE).

## Leitura de abertura
1. `CLAUDE.md` · 2. `docs/00_PLANO_E_CRITERIOS.md` · 3. `handoffs/instrucoes.md` (seções 5 e 6 primeiro) · 4. `docs/06_CONTEUDO_E_RECONCILIACAO.md`.

## Regime de autonomia (continua valendo)
Sem novas aprovações. Perguntar a Max só nos 6 casos do `CLAUDE.md` §0, em uma única mensagem.

## O que está 100% verde (Etapa 01) — com a prova
- <item> — prova: <comando executado + saída obtida> — status: verde

## Portão 01→02
- `npm run dados:validar` → `OK v07` — status: <verde/vermelho>
- `npm test` → `0 failed` — status: <verde/vermelho>
- `npm run build` → exit 0 — status: <verde/vermelho>
- `gitleaks detect --no-banner` → `no leaks found` — status: <verde/vermelho>
- Plano de Ação aprovado (`grep -c "^APROVADO EM:" docs/PLANO_DE_ACAO.md` → `1`) — status: <verde/vermelho>

## Artefatos e onde estão
- `data/matriz_v07.json`, `data/conteudo/mapa_condicionais.json`, decisão do spike 01.5 (`DECISAO: ...`), checklist de Max (`docs/CHECKLIST_MAX.md`).

## O que a Etapa 02 deve construir
- (rota `#/versoes` já existe como placeholder desde a 01.3; a tela real vem na 03.6) · 02.1 V08 · 02.2–02.5 fichas 5W1H por fase · 02.6 bibliotecas · 02.7 UI base · 02.8 tela MMO · 02.9 tela FPE · 02.10 exports FPE · 02.11 deploy protegido · 02.12 fechamento.

## Armadilhas conhecidas / decisões travadas
- Resumo aqui; detalhe em `handoffs/instrucoes.md` seções 5 e 6.

## Pendências vigiadas
- <débitos aceitos que continuam valendo>

## Consumo até aqui vs. teto
- Gasto acumulado: R$ <valor> de R$ 0 (teto).

## Primeiro passo da Etapa 02
- Subetapa 02.1 — compor a Matriz V08 [Auto] [Goal].
