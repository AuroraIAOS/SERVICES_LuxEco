# HANDOFF_BUILD — Lux Ferramentas Operacionais

_Preenchido pelo CODE ao fim da Etapa 01 (subetapa 01.7), em 24/09/2026. Todas as provas abaixo foram executadas de novo nesta subetapa._

## Estado atual
Fundação concluída e versionada (último commit de código: `576c867`). Nova sessão para construir o MVP (MMO v02 + FPE). Repositório `AuroraIAOS/SERVICES_LuxEco` (**privado**), branch `main`. Gasto acumulado: **R$ 0**.

## Leitura de abertura
1. `CLAUDE.md` · 2. `docs/00_PLANO_E_CRITERIOS.md` (Tabela de Progresso no topo) · 3. `handoffs/instrucoes.md` (**seções 2, 5 e 6 primeiro** — têm as decisões e armadilhas desta etapa) · 4. `docs/06_CONTEUDO_E_RECONCILIACAO.md` · 5. `docs/07_BACKUP_NO_SERVIDOR.md`.

## Regime de autonomia (continua valendo)
Plano de Ação aprovado (`APROVADO EM: 2026-09-24` em `docs/PLANO_DE_ACAO.md`). Sem novas aprovações: perguntar a Max só nos 6 casos do `CLAUDE.md` §0, em **uma única mensagem**. Escopo autorizado: subetapas 01.3 a 03.7, teto R$ 0, deploy **só** na hospedagem particular de Max; **não** iniciar a migração (03.8) nem apagar nada no servidor sem novo “aprovado”.

## O que está 100% verde (Etapa 01) — com a prova
- **01.0** repositórios de referência varridos — prova: `git log --oneline -1 -- handoffs/instrucoes.md` → `dc7dd77 docs: varrer repositórios de referência e preencher instrucoes.md` (10/10 com status; 4 entradas na seção 4 e 5 novas na seção 6) — status: verde
- **01.1** ambiente validado — prova: `node scripts/checar_env.mjs | tail -1` → `OBRIGATÓRIAS v01: 17/17 preenchidas`; `git ls-files | grep -c "^\.env$"` → `0`; `curl` sem senha na `APP_URL` → `401` (proteção do cPanel ativa) — status: verde
- **01.2** Plano de Ação aprovado — prova: `grep -c "^APROVADO EM:" docs/PLANO_DE_ACAO.md` → `1` — status: verde
- **01.3** scaffold — prova: `npm run typecheck && npm run lint && npm test && npm run build` → exit 0; `dist/index.html` existe; `npm run e2e` → `1 passed` (4 rotas + fonte Cyntho Next); `build:single` gera `dist-single/index.html` (459 kB) — status: verde
- **01.4** pipeline de dados — prova: `npm run dados:validar | tail -1` → `OK v07: setores=12 estagios=22 celulas=212 if_else=31`; `npx tsx scripts/comparar_mmo_legado.ts | tail -1` → `OK: MMO_v01 == Matriz V07` (presença **e** contagem de ações) — status: verde
- **01.5** spike do fluxograma — prova: `npm run spike:fluxo | tail -1` → `DECISAO: raias_svg` (Mermaid 3/16 no limite, máx 12.219 px; raias 16/16, máx 1.972 px, fonte A3 ≥ 8,1 pt) — status: verde
- **01.6** blindagem — prova: `gitleaks detect --no-banner` → `no leaks found`; `git ls-files referencias_privadas | wc -l` → `0`; `git check-ignore -q data/fontes/Matriz_Operacional.xlsx; echo $?` → `1`; pré-commit bloqueou segredo falso, `.env` forçado e CPF (exit 1 nos três) e aprovou o commit legítimo — status: verde

## Portão 01→02
- `npm run dados:validar` → `OK v07: setores=12 estagios=22 celulas=212 if_else=31` — status: verde
- `npm test` → `Test Files 3 passed (3) · Tests 38 passed (38)` (0 failed) — status: verde
- `npm run build` → exit 0 (`✓ built in 375ms`) — status: verde
- `gitleaks detect --no-banner` → `no leaks found` — status: verde
- Plano de Ação aprovado (`grep -c "^APROVADO EM:" docs/PLANO_DE_ACAO.md` → `1`) — status: verde

`src/telas/` está **vazio** (só `.gitkeep`): o portão libera a criação de telas agora.

## Artefatos e onde estão
- Dados: `data/matriz_v07.json` (212 células, 31 IF/ELSE), `data/conteudo/mapa_condicionais.json` (31 → 15 situações: 17 diretas, 11 “sugerido”, 3 sem situação; divergências de estágio 5, 12, 13, 14).
- Código: `src/dados/tipos.ts`, `scripts/xlsx_para_json.ts`, `scripts/validar_dados.ts`, `scripts/comparar_mmo_legado.ts`, `src/fluxograma/raias.ts` (renderizador escolhido) e `mermaid.ts` (só export `.mermaid`), `scripts/spike_fluxo.ts`, `scripts/checar_env.mjs`, `scripts/pre_commit.mjs`.
- Marca: `design/tokens.json` → `src/estilos/tokens.css` (`npm run tokens:gerar`); fontes em `design/fontes/`.
- Checklist de Max: `docs/CHECKLIST_MAX.md`. Decisão do spike: `handoffs/instrucoes.md` §2.
- Scripts npm **ainda não implementados** (falham com `exit 1` de propósito): `dados:compor` (02.1), `deploy` (02.11), `backup:provar` (03.5).

## O que a Etapa 02 deve construir
02.1 V08 · 02.2–02.5 fichas 5W1H por fase · 02.6 bibliotecas · 02.7 UI base · 02.8 tela MMO · 02.9 tela FPE (usa `raiasSetor`/`raiasFase`, tema escuro na tela e claro no PDF) · 02.10 exports FPE · 02.11 deploy protegido · 02.12 fechamento. A rota `#/versoes` já existe como placeholder; a tela real é a 03.6.

## Armadilhas conhecidas / decisões travadas (detalhe em `handoffs/instrucoes.md` §2, §5, §6)
- **Não abrir** as decisões travadas de `docs/00`. Stack: React **18.3.1** (não 19), `oxlint` (não ESLint), Vitest sem `globals` (`afterEach(cleanup)` no setup).
- **SheetJS/`xlsx`:** o npm 12 desta máquina tem `allow-remote = none` e recusa o tarball do CDN (`EALLOWREMOTE`); o `xlsx` do registro (0.18.5) está defasado. Ficou **adiado para a 03.4** (decidir com Max: habilitar a fonte remota ou vendorizar o `.tgz`). A leitura da planilha na 01.4 usa `fflate` + `fast-xml-parser`.
- **Hospedagem (verificado no cPanel):** `lux.strategicepiphany.com`, servidor `br1002.hostgator.com.br`, **PHP 8.3**, docroot `/home2/maxwe196/lux.strategicepiphany.com` **com senha aplicada no docroot** (Privacidade de diretórios); a subpasta `intelligence/` (a `APP_URL`) **ainda não existe** — criar por FTP na 02.11. Sem senha → `401`; com `SMOKE_BASIC_*` → `404` (pasta ausente). `BACKUP_DIR_SERVIDOR` deve ficar **fora** do docroot.
- **Deploy (02.11):** nunca sobrescrever o `.htaccess` do pai; mesclar o da subpasta; conferir tamanho local × remoto; **nunca** dados em claro no FTP (sigilo); host FTP real, não `ftp.<dominio>`. Rodar o spike de PHP/`ZipArchive`/usuário autenticado já na 02.11.
- **Fluxograma:** SVG de raias; não usar Mermaid para exibir/imprimir. Sempre olhar a imagem, não só os números (contraste AA, palavras inteiras).
- **Pré-commit ativo** (`core.hooksPath=.githooks`, instalado por `npm install`). Nunca `--no-verify`.
- **Circuit breaker do LLM:** teto R$ 0 configurável no painel (03.3); failover de até 3 modelos `:free`.

## Pendências vigiadas
- Chave OpenRouter no bundle público (429/402) · modelos `:free` rotativos (failover de 3 na 03.3) · API PHP de backups depende de PHP ≥ 8 (**8.3 confirmado na homologação**), `ZipArchive` e usuário autenticado (a confirmar na 02.11) · backups no mesmo servidor do site · homologação com dados da Lux na hospedagem de Max (sigilo; descomissionar só com aprovação) · migração sem acessos do contratante · **`xlsx` remoto bloqueado pelo npm (03.4)** · Etapa 04 do contrato sem validação (inclui os vínculos “sugerido” do mapa de condicionais e as 3 células sem situação) · revisão jurídica “boleto”/IBS · licença da fonte Cyntho Next · site sem monitoramento nem backup do servidor.

## Consumo até aqui vs. teto
- Gasto acumulado: **R$ 0** de R$ 0 (teto). Nenhum serviço pago acionado.

## Primeiro passo da Etapa 02
- **Subetapa 02.1 — compor a Matriz V08** [Auto] [Goal]: ler `data/fontes/Anotacoes_CEO_2026-09-24.md` inteiro, escrever `data/conteudo/anotacoes_v08.json` conforme `docs/06` §3, implementar `scripts/compor_v08.ts` (overlay sem alterar a V07), estender `validar_dados.ts` com `--v08` (regra 3) e ligar o script `dados:compor`. Preencher `situacao_id` das condicionais a partir de `mapa_condicionais.json`.
