# PLANO_E_CRITERIOS — Lux Ferramentas Operacionais (MMO v02 · FPE · POP)

## Tabela de Progresso
_Atualizada pelo CODE ao iniciar e ao concluir cada etapa/subetapa (CLAUDE.md §6). Status aparece aqui e logo abaixo do título de cada item._

**Legenda:** ✅ CONCLUÍDA (código, testes, deploy e verificação 100% verdes) · ⏸️ ADIADA (deixada para o futuro) · ⚠️ PENDENTE (em aberto, sem bloquear o avanço) · 🛑 ABANDONADA (permanece registrada) · ⬜ A FAZER (ainda não iniciada — estado inicial, anterior às quatro marcas do §6).

| Item | Título | Modo · função · LLM | Status | Observação / prova |
|---|---|---|---|---|
| **Etapa 01** | PLANEJAMENTO E ESTRUTURAS |  | ⬜ A FAZER | em curso — próxima: 01.1 |
| 01.0 | Varrer repositórios de referência e preencher instrucoes.md | [Plan] [LLM: Sonnet] | ✅ CONCLUÍDA | 10/10 repositórios com status (o plano dizia 9; a tabela tem 10); 4 entradas na seção 4 e 5 novas na seção 6 de `instrucoes.md`; achados aplicados às subetapas 02.11 e 03.5. |
| 01.1 | Validar ambiente e `.env`; emitir checklist único de ações manuais | [Plan] [LLM: Sonnet] | ⚠️ PENDENTE | `node scripts/checar_env.mjs` → `OBRIGATÓRIAS v01: 15/17`; faltam `SMOKE_BASIC_USER/PASS` (só a 02.11 precisa). Checklist em `docs/CHECKLIST_MAX.md`. |
| 01.2 | Plano de Ação e aprovação | [Plan] [Accept] [LLM: Sonnet] | ⬜ A FAZER |  |
| 01.3 | Scaffold do projeto e tooling | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 01.4 | Pipeline xlsx → `matriz_v07.json` e validações de dados | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 01.5 | Spike de legibilidade do fluxograma (Mermaid × SVG de raias) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 01.6 | Varredura de segredos e blindagem do repositório | [Auto] [LLM: Sonnet] | ⬜ A FAZER |  |
| 01.7 | HANDOFF_BUILD | [Auto] [LLM: Sonnet] | ⬜ A FAZER |  |
| **Etapa 02** | CONSTRUÇÃO E DEPLOY DO MVP |  | ⬜ A FAZER |  |
| 02.1 | Compor a Matriz V08 (Anotações integradas) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.2 | Fichas 5W1H, Fase 1 Comercial (Est. 01–09) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.3 | Fichas 5W1H, Fase 2 Técnica/Projeto (Est. 10–14) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.4 | Fichas 5W1H, Fase 3 Execução (Est. 15–19) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.5 | Fichas 5W1H, Fase 4 Homologação e Encerramento + consolidação (Est. 20–22) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.6 | Bibliotecas: documentos, ferramentas, investimentos e KPIs | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.7 | Base de UI e navegação entre as 3 telas | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.8 | Tela MMO v02 | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.9 | Tela FPE: formulário 5W1H + fluxograma | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.10 | Exportações do FPE (JSON, MD, MERMAID, PDF) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.11 | Deploy protegido e prova do portão | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 02.12 | HANDOFF_UPGRADE e CHANGELOG do MVP | [Auto] [LLM: Sonnet] | ⬜ A FAZER |  |
| **Etapa 03** | UPGRADES E VERSIONAMENTOS |  | ⬜ A FAZER |  |
| 03.1 | Tela POP: perguntas estratégicas e geração por template | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 03.2 | Exportar POP em .docx e .pdf | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 03.3 | LLM: seletor padrão/particular, consentimento e fallback | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 03.4 | Exportar XLSX (FPE e POP) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 03.5 | API PHP de backups versionados no servidor (limite 10) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 03.6 | Tela “Versões salvas” (`#/versoes`) e botão “Salvar versão” | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 03.7 | Build offline, guia do contratante e deploy final (homologação) | [Auto] [Goal] [LLM: Sonnet] | ⬜ A FAZER |  |
| 03.8 | Migração para a hospedagem do contratante | [Auto após aprovação] [LLM: Sonnet] | ⬜ A FAZER |  |

**Fora das etapas (já feito, registrado no Git):** estágio criativo (fundação) · replanejamento de 24/09/2026 — backup no servidor no lugar do Drive, teto do LLM configurável, homologação na hospedagem de Max (commits `64589e1`, `edd34e6`).

---

## Princípio-guia
Entregar um MVP em uma semana é sempre melhor que passar uma eternidade construindo algo surreal.
Foco: fatia vertical funcional (100% verde) antes de qualquer sofisticação.
A arquitetura não se redesenha — se implementa.

## Idea lock (reference lock fechado no estágio criativo — 24/09/2026, TIPO 02 Organização)
- **Problema/persona:** a Lux (CEO Luan) precisa do MMO, FPE e POPs previstos no contrato de consultoria; Max (consultor) não tem mais acesso ao contratante, então a ferramenta entrega tudo pré-preenchido com o que já se sabe e deixa a Lux completar, validar e exportar.
- **Escopo do MVP (Etapas 01–02):** `matriz_v07.json` (espelho da planilha) e `matriz_v08.json` (Anotações do CEO integradas); fichas 5W1H completas; bibliotecas de documentos, ferramentas, investimentos (sem valores) e KPIs; telas **MMO v02** e **FPE** (formulário + fluxograma + exports JSON/MD/MERMAID/PDF); deploy protegido no HostGator.
- **Fora do MVP (Etapa 03):** tela POP e geração de texto (LLM + fallback), export `.docx`, export `.xlsx`, **backup HTML versionado no servidor (máx. 10) + tela “Versões salvas” (`#/versoes`)**, build `.html` offline, guia do contratante, migração para a hospedagem do contratante.
- **Stack essencial v01:** React 18 + TS + Vite · HashRouter · Mermaid (fallback SVG de raias) · SheetJS · `docx` · Vitest + Playwright · `basic-ftp` · HostGator (subdomínio https + senha no cPanel) · **API PHP mínima de backups (mesma hospedagem, mesma senha do cPanel)** · OpenRouter (`:free`) com fallback. Detalhes: `docs/01_ARQUITETURA.md`.
- **Coração do modelo de dados:** `setor`, `estagio`, `acao`, `condicional`, `ficha_5w1h`, `documento`, `ferramenta`, `investimento`, `kpi`, `oportunidade`, `perfil_cliente`, `pop_gerado`, `versao_backup`. Detalhes: `docs/02_MODELO_DE_DADOS.md`.
- **Decisões travadas (não reabrir):** Matriz V07 é a fonte · MMO refeito do JSON integrando as Anotações · acesso via URL https protegida por senha · template fixo do POP com LLM só para redigir · preencher tudo **sem selo visível** (`origem` só no JSON) · “Quem” = função/setor + equipes nomeadas na Matriz · diretrizes “boleto”/IBS reproduzidas fielmente + seção final de observações para revisão jurídica · teto de gasto R$ 0 · **(replanejamento de 24/09/2026, diretriz de Max)** sem backup em nuvem do Google (Drive/OAuth descartados): backups são **HTML autossuficientes versionados no próprio servidor**, **limite de 10**, geridos na tela `#/versoes` (listar, selecionar unitário/lote, baixar, excluir e demais ações em massa) · **duas hospedagens em sequência:** homologação na hospedagem particular de Max; migração para a do contratante só após “aprovado” de Max (subetapa 03.8).
- **Restrições inegociáveis:** ver `docs/05_COMPLIANCE_E_ETICA.md` (sigilo, contrato fora do Git, senha no site, aviso+consentimento no LLM, zero R$/SLA inventado).
- **Decisões pendentes p/ Etapa 01 (execução, não de desenho):** (a) legibilidade do Mermaid — spike 01.5; (b) agrupamento das 31 células IF/ELSE nas 15 situações — 01.4; (c) modelo `:free` vigente do OpenRouter — 03.3 (search-first); (d) versão do PHP, `ZipArchive` e variável de usuário autenticado (`REMOTE_USER`) disponíveis na hospedagem de Max — spike no início da 03.5.

## Regime de autonomia (diretriz de Max — prazo apertado)
1. O **único ponto de aprovação humana obrigatório** é o Plano de Ação (subetapa 01.2).
2. Depois dele, o CODE trabalha em modo **autônomo** até o fim da Etapa 03: decide, registra e segue.
3. O CODE só pergunta nos 6 casos listados em `CLAUDE.md` §0 — e sempre em **uma única mensagem consolidada**.
4. Cada subetapa se autovalida pela **Evidência** (comando + saída). Verde → commit + push + próxima subetapa, sem esperar resposta.

## Circuit breaker financeiro
- **Teto de gasto mensal (padrão):** R$ 0. **Configurável pelo contratante na própria ferramenta** (painel “Limite de gasto da IA” na tela POP (seção LLM)): o `.env` só fornece o valor inicial (`LLM_TETO_MENSAL_BRL`, `LLM_ALERTA_EM_PERCENTUAL`, embutidos no build), porque o contratante não tem acesso ao `.env`. O valor efetivo fica salvo no servidor (`config_llm`, via API PHP) com cópia local; vale para todos os usuários da ferramenta.
- **Alerta em:** percentual configurável (padrão 100%) — e qualquer HTTP 402 ou 429 recorrente → fallback determinístico e registro em `handoffs/instrucoes.md`.
- **Distinção importante:** o teto de **Max** (projeto, R$ 0) rege o que o CODE pode gastar; o painel rege o gasto do **contratante com a chave dele** (“LLM particular”). A chave padrão do OpenRouter continua sem saldo (limite US$ 0 na própria chave), então o painel não consegue fazê-la gastar.
- **Exige aprovação manual de Max antes de executar:** comprar crédito OpenRouter, contratar plano pago, proxy/servidor, domínio novo, qualquer serviço com custo.

## Credenciais necessárias (do .env) — somente nomes, sem valores
- **[OBRIGATÓRIA v01]** (Max providencia antes de abrir o CODE): `APP_NOME`, `APP_AMBIENTE`, `APP_URL`, `FUSO_HORARIO`, `VITE_APP_NOME`, `VITE_APP_URL`, `LLM_TETO_MENSAL_BRL`, `LLM_ALERTA_EM_PERCENTUAL`, `HOSTGATOR_DOMINIO`, `HOSTGATOR_FTP_HOST`, `HOSTGATOR_FTP_USER`, `HOSTGATOR_FTP_PASS`, `HOSTGATOR_FTP_PORT`, `HOSTGATOR_FTP_TLS`, `HOSTGATOR_REMOTE_DIR`, `SMOKE_BASIC_USER`, `SMOKE_BASIC_PASS`.
- **[FUTURA — Etapa 03]** (providenciar já, para o CODE não parar): `VITE_OPENROUTER_API_KEY`, `VITE_OPENROUTER_MODELO_PADRAO`, `VITE_LLM_LIMITE_DIARIO_FREE`, `BACKUP_LIMITE_MAX` (padrão 10), `BACKUP_DIR_SERVIDOR` (pasta dos backups na hospedagem; padrão `../lux_backups`, fora da raiz web).
- **[OBSOLETA — Drive descartado em 24/09/2026]:** `VITE_GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_DRIVE_PASTA_NOME`, `GOOGLE_OAUTH_MODO_CONSENTIMENTO`. Podem continuar no `.env` (o `checar_env.mjs` deve ignorá-las); não devem ser lidas por nenhum código.
- **[CONDICIONAL]:** `CPANEL_DIRETORIO`, `LOG_NIVEL`.
- **Ambientes:** `APP_AMBIENTE=homologacao` (hospedagem particular de Max) até a aprovação; na migração (03.8) Max troca `HOSTGATOR_*`, `APP_URL`, `SMOKE_*` e `APP_AMBIENTE=producao` para os da hospedagem do contratante. O código não muda entre ambientes.
- **Ações manuais de Max (juntas, uma vez — entregues pelo CODE na 01.1):** criar subdomínio + conta FTP + proteção de diretório por senha (cPanel) **na hospedagem particular**; confirmar no cPanel PHP ≥ 8.0 ativo no subdomínio; criar chave OpenRouter dedicada com limite US$ 0; criar repositório GitHub **privado**. _(Sem OAuth/Google Cloud.)_

---

# ESTÁGIO PRÁTICO (executado no Claude CODE)

## ETAPA 01 — PLANEJAMENTO E ESTRUTURAS
Status: ⬜ A FAZER
Objetivo geral: fundação desenhada, conectada, testada, aprovada e versionada; pipeline de dados verde. Gerar HANDOFF_BUILD ao final.
Modo predominante: [Plan Mode] até a 01.2 (aprovação); depois [Auto] + [Goal].
Portão de entrada: repositório criado (privado), `.env` preenchido com as variáveis `[OBRIGATÓRIA v01]`.
**PORTÃO 01→02:** nenhuma tela real (`src/telas/`) antes de: `npm run dados:validar` → `OK v07` · `npm test` → `0 failed` · `npm run build` → exit 0 · `gitleaks` → `no leaks found` · Plano de Ação aprovado. Enquanto vermelho, é **proibido** criar componentes em `src/telas/`.
Observações: nada destrutivo sem aprovação; commit com prefixo padronizado + push ao fim de cada subetapa; sessão separada das demais etapas.

### Subetapa 01.0 — Varrer repositórios de referência e preencher instrucoes.md [Plan] [LLM: Sonnet]
Status: ✅ CONCLUÍDA
Objetivo: extrair dos repositórios da seção 1 de `handoffs/instrucoes.md` o que serve a este projeto.
Arquivos tocados: `handoffs/instrucoes.md`.
Passos: 1) Ler a tabela da seção 1. 2) Consultar CRM-Sindcom (deploy FTP HostGator, `.htaccess`, portões), OS_Affiliate (circuit breaker), superpowers e ECC (provas e economia de token), React (API atual). 3) Registrar “não aplicável” em uma linha para hermes-agent, OpenClaw, Public-APIs, Build-your-own-X e Awesome-selfhosted. 4) Preencher seções 4 e 6 (entradas Gatilho → Ação → Evidência → Fonte) e “Status da varredura” da seção 1.
Conclusão: seção 1 com status de todos os 10 repositórios; seção 4 com ≥ 3 entradas; nenhuma entrada sem as quatro linhas.
Qualidade: entradas específicas a este projeto, não resumos de README.
Evidência: `git log --oneline -1 -- handoffs/instrucoes.md` → linha contendo `docs: varrer repositórios de referência`.
Teto de esforço: 30 minutos. Se estourar, registrar o que já achou e seguir.

### Subetapa 01.1 — Validar ambiente e `.env`; emitir checklist único de ações manuais [Plan] [LLM: Sonnet]
Status: ⚠️ PENDENTE _(script e checklist prontos; falta Max preencher `SMOKE_BASIC_USER/PASS` — bloqueia só a 02.11)_
Objetivo: descobrir de uma vez tudo o que falta a Max, sem parar depois.
Arquivos tocados: `scripts/checar_env.mjs`, `docs/CHECKLIST_MAX.md`.
Passos: 1) `node -v` deve ser ≥ 20. 2) Criar `scripts/checar_env.mjs` que lê `.env`, lista variáveis por status (`[OBRIGATÓRIA v01]`, `[FUTURA — Etapa 03]`, `[CONDICIONAL]`) e detecta placeholders (`[...]`, `sk-or-v1-...`). 3) Rodar. 4) Gerar `docs/CHECKLIST_MAX.md` com **todas** as ações manuais pendentes (cPanel na hospedagem particular incluindo PHP ≥ 8, chave OpenRouter, repositório) em uma lista única com passo a passo curto. Ignorar as variáveis `[OBSOLETA]` (Google/Drive). 5) Se faltar alguma `[OBRIGATÓRIA v01]`, enviar a Max **uma única mensagem** com o checklist e aguardar; se faltarem só `[FUTURA]`, seguir sem parar.
Conclusão: script roda; checklist gerado; obrigatórias preenchidas.
Qualidade: o checklist cabe em uma tela; sem jargão desnecessário.
Evidência: `node scripts/checar_env.mjs` → linha `OBRIGATÓRIAS v01: 17/17 preenchidas` e exit 0; `git ls-files | grep -c "^\.env$"` → `0`.

### Subetapa 01.2 — Plano de Ação e aprovação [Plan] [Accept] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: obter a única aprovação humana antes do modo autônomo.
Arquivos tocados: `docs/PLANO_DE_ACAO.md`.
Passos: 1) Ler `CLAUDE.md`, este plano, `docs/01`, `02`, `04`, `05`, `06`. 2) Escrever `docs/PLANO_DE_ACAO.md` (≤ 2 páginas): ordem real de execução, lotes de conteúdo por fase, riscos (Mermaid, volume de fichas, PHP/permissões no servidor de backup), o que roda em paralelo, estimativa por etapa em horas de CODE. 3) Apresentar a Max e pedir “aprovado”. 4) Ao receber, acrescentar a linha `APROVADO EM: <data>` no fim do arquivo e commitar.
Conclusão: arquivo existe e contém a linha de aprovação.
Qualidade: sem alternativas em aberto; decisões já travadas não são reabertas.
Evidência: `grep -c "^APROVADO EM:" docs/PLANO_DE_ACAO.md` → `1`.
Após esta subetapa vale o **Regime de autonomia**.

### Subetapa 01.3 — Scaffold do projeto e tooling [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: projeto Vite + React + TS rodando, com scripts e testes.
Arquivos tocados: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `index.html`, `src/main.tsx`, `src/app.tsx`, `src/telas/.gitkeep`, `design/tokens.json`, `src/estilos/tokens.css`, `README.md` (seção “Como rodar”).
Passos: 1) Rodar `npm create vite@latest tmp_vite -- --template react-ts`; mover os arquivos gerados para a raiz **exceto** `README.md`; apagar `tmp_vite/`. 2) Instalar `react-router-dom`, `react-hook-form`, `zod`, `mermaid`, `xlsx`, `docx`, `basic-ftp`, `tsx`, `vitest`, `@testing-library/react`, `@playwright/test`, `vite-plugin-singlefile`, `eslint`; rodar `npx playwright install chromium`. 3) Scripts npm: `dev`, `build`, `build:single`, `typecheck` (`tsc --noEmit`), `lint`, `test` (`vitest run`), `e2e` (`playwright test`), `dados:gerar`, `dados:compor`, `dados:validar`, `env:checar`, `deploy`, `spike:fluxo`, `backup:provar` (placeholder até a 03.5). 4) Gerar `design/tokens.json` e `src/estilos/tokens.css` a partir de `docs/04`; carregar as fontes de `design/fontes/` via `@font-face`. 5) `HashRouter` com rotas `#/mmo`, `#/fpe`, `#/pop`, `#/versoes` renderizando um placeholder (fora de `src/telas/`, em `src/app.tsx`). 6) Preencher “Como rodar” no README.
Conclusão: `typecheck`, `lint`, `test` e `build` verdes; fontes e tokens carregam.
Qualidade: sem dependências além das listadas; sem código de negócio.
Evidência: `npm run typecheck && npm run lint && npm test && npm run build` → exit 0; `test -f dist/index.html && echo ok` → `ok`.
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas + 2–3 alternativas); registrar em `handoffs/instrucoes.md` seção 5.

### Subetapa 01.4 — Pipeline xlsx → `matriz_v07.json` e validações de dados [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: espelho fiel da Matriz V07 em JSON, com testes de contagem e de paridade com o MMO_v01.
Arquivos tocados: `scripts/xlsx_para_json.ts`, `scripts/validar_dados.ts`, `scripts/comparar_mmo_legado.ts`, `data/matriz_v07.json`, `data/conteudo/mapa_condicionais.json`, `src/dados/tipos.ts`, `src/dados/validar.test.ts`.
Passos: 1) `xlsx_para_json.ts`: ler `data/fontes/Matriz_Operacional.xlsx`, **parar na linha “LEGENDA DE CORES”**; emitir `setores`, `estagios` (22, em 4 fases), `acoes` (uma por célula não vazia), `condicionais` (células com “IF/ELSE”, separando condição e ações consequentes). 2) `validar_dados.ts` implementa as regras 1, 2, 4–8 de `docs/02_MODELO_DE_DADOS.md` (as de V08/fichas/bibliotecas ficam inativas até existirem). 3) `comparar_mmo_legado.ts`: extrair presença setor × estágio do `data/fontes/legado/MMO_v01.html` e comparar com o JSON. 4) Agrupar as 31 células IF/ELSE nas 15 situações do Mapa em `mapa_condicionais.json`; se não fechar em 15, registrar a diferença em `docs/06` §2. 5) Testes em Vitest.
Conclusão: JSON gerado; validações e comparação verdes; mapa de condicionais escrito.
Qualidade: JSON estável (ordem determinística, `\n` normalizado); erros de validação com mensagem clara.
Evidência: `npm run dados:gerar && npm run dados:validar | tail -1` → `OK v07: setores=12 estagios=22 celulas=212 if_else=31`; `npx tsx scripts/comparar_mmo_legado.ts | tail -1` → `OK: MMO_v01 == Matriz V07`; `npm test` → `0 failed`.
Esforço máximo do /goal: 5 tentativas.
Escalonamento de LLM: Sonnet nas 4 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto; registrar em `instrucoes.md` seção 5.

### Subetapa 01.5 — Spike de legibilidade do fluxograma (Mermaid × SVG de raias) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: decidir com números se o Mermaid dá conta de 22 estágios × 12 setores.
Arquivos tocados: `scripts/spike_fluxo.ts`, `src/fluxograma/mermaid.ts`, `src/fluxograma/raias.ts` (só se reprovar), `handoffs/instrucoes.md`.
Passos: 1) Gerar o Mermaid (`flowchart LR`) de **cada setor** (nós = ações em ordem de estágio; IF/ELSE como losango) e do **fluxo geral por fase** (4 grafos). 2) Renderizar em Chromium headless (Playwright) e medir a largura do SVG. 3) Critérios: setor ≤ 2600 px de largura; fase ≤ 3200 px. 4) Se algum reprovar, implementar o SVG de raias próprio (`raias.ts`) e repetir a medição. 5) Registrar a decisão e os números em `handoffs/instrucoes.md` (seção 2).
Conclusão: decisão registrada; renderizador escolhido passa nos limites.
Qualidade: PDF em A3 paisagem legível (fonte efetiva ≥ 8 pt) — verificado pelo cálculo de escala impresso no relatório do script.
Evidência: `npm run spike:fluxo | tail -1` → `DECISAO: mermaid` **ou** `DECISAO: raias_svg`.
Esforço máximo do /goal: 5 tentativas.
Escalonamento de LLM: Sonnet nas 4 primeiras; na última, Opus.
Se esgotar: parar; relatório curto com as medições e as alternativas (dividir o fluxo geral por fase em páginas; reduzir rótulos).

### Subetapa 01.6 — Varredura de segredos e blindagem do repositório [Auto] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: garantir que nada sensível entra no histórico.
Arquivos tocados: `.husky/pre-commit` (ou `scripts/pre_commit.mjs`), `handoffs/instrucoes.md`.
Passos: 1) Instalar `gitleaks` (binário) e rodar sobre o histórico. 2) Configurar pré-commit que roda `gitleaks protect --staged`. 3) Provar as exclusões do `.gitignore`.
Conclusão: zero achados; `.env`, `referencias_privadas/` e `screenshots/` ignorados; Matriz xlsx versionável.
Qualidade: pré-commit não bloqueia commits legítimos.
Evidência: `gitleaks detect --no-banner` → `no leaks found`; `git ls-files | grep -c "^\.env$"` → `0`; `git ls-files referencias_privadas | wc -l` → `0`; `git check-ignore -q data/fontes/Matriz_Operacional.xlsx; echo $?` → `1`.

### Subetapa 01.7 — HANDOFF_BUILD [Auto] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: fechar a Etapa 01 e abrir a 02 em sessão limpa.
Arquivos tocados: `handoffs/HANDOFF_BUILD.md`, `CHANGELOG.md`.
Passos: 1) Preencher `HANDOFF_BUILD.md` (verde com prova, portão, artefatos, primeiro passo da 02.1). 2) Registrar no `CHANGELOG.md`. 3) Commit + push.
Conclusão: handoff preenchido; portão 01→02 verde.
Qualidade: cada item “verde” traz o comando e a saída reais.
Evidência: `grep -c "status: verde" handoffs/HANDOFF_BUILD.md` → `>= 5`.

---

## ETAPA 02 — CONSTRUÇÃO E DEPLOY DO MVP (v01 / fatia vertical: MMO v02 + FPE)
Status: ⬜ A FAZER
Objetivo geral: V08 + conteúdo completo + telas MMO e FPE com exports locais, no ar e protegido. Gerar HANDOFF_UPGRADE ao final.
Modo predominante: [Auto] + [Goal] (um `/goal` por subetapa). Sessão nova, abrir com `HANDOFF_BUILD.md`.
Portão de entrada: portão 01→02 verde (repetido).
**PORTÃO 02→03:** MVP acessível na URL de produção **e protegido**: `curl` sem senha → `401`, com senha → `200` · `npm test` → `0 failed` · `npm run e2e` → `passed` · `npm run dados:validar -- --v08 --fichas --bibliotecas` → 3 linhas `OK` · `gitleaks` → `no leaks found`. Enquanto vermelho, é **proibido** iniciar LLM, backup no servidor, XLSX ou tela POP.
Observações: coletar evidências; commit + push por subetapa; conteúdo gerado segue `docs/06` (nunca inventar; sem selo visível; sem R$/SLA).

### Subetapa 02.1 — Compor a Matriz V08 (Anotações integradas) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: `matriz_v08.json` = V07 + overlay das Anotações do CEO.
Arquivos tocados: `data/conteudo/anotacoes_v08.json`, `scripts/compor_v08.ts`, `data/matriz_v08.json`, `src/dados/v08.test.ts`.
Passos: 1) Ler `data/fontes/Anotacoes_CEO_2026-09-24.md` inteiro. 2) Escrever `anotacoes_v08.json` seguindo `docs/06` §3 (ações e IF/ELSE novos com `origem_doc: "anotacoes_ceo_2026-09-24"`; `perfil_cliente`; `oportunidade`). 3) `compor_v08.ts`: aplicar o overlay sobre `matriz_v07.json` sem alterar o que já existe. 4) Estender `validar_dados.ts` com `--v08` (regra 3). 5) Testes.
Conclusão: V08 gerada; nenhuma ação/condicional da V07 alterada; todo item novo tem `origem_doc`.
Qualidade: textos das ações no mesmo tom curto e autoexplicativo da Matriz; sem renomear estágios/setores.
Evidência: `npm run dados:compor && npm run dados:validar -- --v08 | tail -1` → `OK v08: setores=12 estagios=22 celulas=<N> if_else=<M> novos=<K>` com `N > 212` e `K >= 1`; `npm test -- v08` → `0 failed`.
Esforço máximo do /goal: 5 tentativas.
Escalonamento de LLM: Sonnet nas 4 primeiras; na última, Opus.
Se esgotar: parar; relatório curto; registrar em `instrucoes.md`.

### Subetapa 02.2 — Fichas 5W1H, Fase 1 Comercial (Est. 01–09) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: 1 ficha completa por célula da Fase 1.
Arquivos tocados: `data/conteudo/fichas_5w1h.json`, `scripts/validar_dados.ts`.
Passos: 1) Para cada `acao` da V08 com `estagio_id` 1–9, criar a ficha conforme `docs/06` §4 (campos, `origem`, `fontes`). 2) Estender `validar_dados.ts` com `--fichas [--fase=N]`.
Conclusão: fichas da fase = ações da fase; nenhum campo vazio; `who` sem nome de pessoa interna.
Qualidade: `what` fiel à ação; `why/where/when/how` só com o que os documentos sustentam (o resto vira `sugerido`, sem cifra e sem prazo).
Evidência: `npm run dados:validar -- --fichas --fase=1 | tail -1` → `OK fichas fase 1: <n>/<n>` (numerador = denominador).
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar; relatório curto.

### Subetapa 02.3 — Fichas 5W1H, Fase 2 Técnica/Projeto (Est. 10–14) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: 1 ficha completa por célula da Fase 2.
Arquivos tocados: `data/conteudo/fichas_5w1h.json`, `scripts/validar_dados.ts`.
Passos: 1) Para cada `acao` da V08 com `estagio_id` de 10 a 14, criar a ficha conforme `docs/06` §4 (campos, `origem`, `fontes`). 2) Acrescentar as fichas ao `fichas_5w1h.json` sem alterar as das fases anteriores. 3) Rodar `--fichas --fase=2`.
Conclusão: fichas da fase = ações da fase; nenhum campo vazio; `who` sem nome de pessoa interna.
Qualidade: `what` fiel à ação; `why/where/when/how` só com o que os documentos sustentam (o resto vira `sugerido`, sem cifra e sem prazo).
Evidência: `npm run dados:validar -- --fichas --fase=2 | tail -1` → `OK fichas fase 2: <n>/<n>` (numerador = denominador).
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas + alternativas); registrar em `handoffs/instrucoes.md` seção 5.

### Subetapa 02.4 — Fichas 5W1H, Fase 3 Execução (Est. 15–19) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: 1 ficha completa por célula da Fase 3.
Arquivos tocados: `data/conteudo/fichas_5w1h.json`, `scripts/validar_dados.ts`.
Passos: 1) Para cada `acao` da V08 com `estagio_id` de 15 a 19, criar a ficha conforme `docs/06` §4 (campos, `origem`, `fontes`). 2) Acrescentar as fichas ao `fichas_5w1h.json` sem alterar as das fases anteriores. 3) Rodar `--fichas --fase=3`.
Conclusão: fichas da fase = ações da fase; nenhum campo vazio; `who` sem nome de pessoa interna.
Qualidade: `what` fiel à ação; `why/where/when/how` só com o que os documentos sustentam (o resto vira `sugerido`, sem cifra e sem prazo).
Evidência: `npm run dados:validar -- --fichas --fase=3 | tail -1` → `OK fichas fase 3: <n>/<n>` (numerador = denominador).
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas + alternativas); registrar em `handoffs/instrucoes.md` seção 5.

### Subetapa 02.5 — Fichas 5W1H, Fase 4 Homologação e Encerramento + consolidação (Est. 20–22) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: 1 ficha completa por célula da Fase 4.
Arquivos tocados: `data/conteudo/fichas_5w1h.json`, `scripts/validar_dados.ts`.
Passos: 1) Incluir as ações novas do Est. 22 vindas das Anotações. 2) Para cada `acao` da V08 com `estagio_id` de 20 a 22, criar a ficha conforme `docs/06` §4 (campos, `origem`, `fontes`). 3) Acrescentar as fichas ao `fichas_5w1h.json` sem alterar as das fases anteriores. 4) Rodar `--fichas --fase=4` e depois `--fichas` (total).
Conclusão: fichas da fase = ações da fase; nenhum campo vazio; `who` sem nome de pessoa interna.
Qualidade: `what` fiel à ação; `why/where/when/how` só com o que os documentos sustentam (o resto vira `sugerido`, sem cifra e sem prazo).
Evidência: `npm run dados:validar -- --fichas --fase=4 | tail -1` → `OK fichas fase 4: <n>/<n>`; `npm run dados:validar -- --fichas | tail -1` → `OK fichas: <N>/<N>` (uma ficha por ação da V08, total).
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas + alternativas); registrar em `handoffs/instrucoes.md` seção 5.

### Subetapa 02.6 — Bibliotecas: documentos, ferramentas, investimentos e KPIs [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: cobrir as Etapas 6.c–6.h do contrato.
Arquivos tocados: `data/conteudo/documentos.json`, `ferramentas.json`, `investimentos.json`, `kpis.json`, `scripts/validar_dados.ts`.
Passos: 1) Seguir `docs/06` §4 (documentados vs sugeridos; investimentos como categorias, `valor_estimado_brl: null`; KPIs com formulário e `meta: null`). 2) Mínimo de 1 KPI de produtividade e 1 de eficiência por setor (12 setores, inclusive Cemig e Cliente como indicadores de acompanhamento). 3) Estender `--bibliotecas`.
Conclusão: regras 6 e 7 de `docs/02` verdes.
Qualidade: nomes curtos; fórmulas descritas em uma linha; nenhuma meta numérica.
Evidência: `npm run dados:validar -- --bibliotecas | tail -1` → `OK bibliotecas: setores=12 kpis_produtividade>=12 kpis_eficiencia>=12 valores_brl=0`.
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 02.7 — Base de UI e navegação entre as 3 telas [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: shell da aplicação com a identidade Lux.
Arquivos tocados: `src/app.tsx`, `src/ui/*` (cabeçalho, hero, botões, cards, formulário base), `src/estilos/*.css`, `src/ui/ui.test.tsx`.
Passos: 1) Componentes base usando **só** os tokens de `design/tokens.json`. 2) Navegação por teclado; `aria-label` nos botões de exportação. 3) Rodapé com a nota de propriedade intelectual sugerida em `docs/05`. 4) Testes de renderização e de acessibilidade básica.
Conclusão: 3 rotas navegáveis; nenhum valor de cor/tipografia fora dos tokens.
Qualidade: contraste AA; foco visível.
Evidência: `npm test -- ui` → `0 failed`; `grep -rEn "#[0-9A-Fa-f]{6}" src --include=*.tsx | wc -l` → `0` (cores só nos tokens CSS).
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 02.8 — Tela MMO v02 [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: dashboard do MMO renderizado do `matriz_v08.json`, com paridade de funcionalidades do MMO_v01 + as Anotações.
Arquivos tocados: `src/telas/mmo/*`, `src/telas/mmo/mmo.test.tsx`, `e2e/mmo.spec.ts`.
Passos: 1) Hero com estatísticas **calculadas** do JSON. 2) 22 pills expansíveis por fase (setor → ações; ramos IF/ELSE com ✓/✗; tag WhatsApp). 3) 12 cards de setor. 4) Bloco de condicionais. 5) Bloco “Jornada do cliente”. 6) Ramificações novas (perfis, Energia por Assinatura, pós-venda) visíveis no Est. 02 e no Est. 22. 7) Testes de unidade e e2e.
Conclusão: paridade com o MMO_v01 + itens da V08.
Qualidade: layout dashboard (não radial); tempo de renderização inicial < 2 s no e2e.
Evidência: `npm test -- mmo` → `0 failed`; `npm run e2e -- mmo` → `passed`; `grep -rn "210+" src | wc -l` → `0`.
Esforço máximo do /goal: 5 tentativas.
Escalonamento de LLM: Sonnet nas 4 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 02.9 — Tela FPE: formulário 5W1H + fluxograma [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: formulário pré-preenchido, editável, e diagramação gerada das respostas.
Arquivos tocados: `src/telas/fpe/*`, `src/fluxograma/*`, `src/estado/armazenamento.ts`, `src/telas/fpe/fpe.test.tsx`, `e2e/fpe.spec.ts`.
Passos: 1) Navegação setor → estágio → ficha; campos 5W1H com valores da V08 e edição livre. 2) Edições persistem em `localStorage` (`try/catch`; funciona com storage vazio) e marcam `origem: "manual"` no estado. 3) Botão “Gerar fluxograma” usa o renderizador decidido na 01.5, por setor e geral por fase. 4) Botão “Restaurar padrão” por ficha. 5) Testes.
Conclusão: editar → gerar fluxograma reflete a edição; recarregar mantém a edição.
Qualidade: nenhuma perda de dado ao trocar de setor; texto sempre escapado.
Evidência: `npm test -- fpe` → `0 failed`; `npm run e2e -- fpe` → `passed`.
Esforço máximo do /goal: 5 tentativas.
Escalonamento de LLM: Sonnet nas 4 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 02.10 — Exportações do FPE (JSON, MD, MERMAID, PDF) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: “memória exportável” do FPE.
Arquivos tocados: `src/exportar/json.ts`, `md.ts`, `mermaid.ts`, `pdf.ts`, `src/estilos/impressao.css`, `src/exportar/exportar.test.ts`.
Passos: 1) JSON com carimbo de versão e data. 2) MD legível por setor. 3) `.mermaid` por setor e geral. 4) PDF por impressão (`@page` A3 paisagem para o fluxograma, A4 para o texto), com fundo branco. 5) Teste de ida e volta: exportar JSON → importar → estado idêntico.
Conclusão: 4 formatos exportam; importação do JSON restaura o estado.
Qualidade: nomes de arquivo `fpe_<setor|geral>_<AAAA-MM-DD>.<ext>`.
Evidência: `npm test -- exportar` → `0 failed` (inclui ida e volta).
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 02.11 — Deploy protegido e prova do portão [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: MVP no ar, atrás de senha.
Arquivos tocados: `scripts/deploy_ftp.ts`, `public/.htaccess` (cache e HTTPS), `docs/CHECKLIST_MAX.md` (status).
Passos: 1) `npm run build`. 2) `deploy_ftp.ts`: enviar `dist/` por FTPS para `HOSTGATOR_REMOTE_DIR` (**hospedagem particular de Max = homologação**), sem apagar o que não for do build — em particular **nunca** tocar em `BACKUP_DIR_SERVIDOR` nem em `api/config.php` (dados do usuário no servidor). O script lê o destino só do `.env`, para a migração da 03.8 não exigir mudança de código. **Regras herdadas (instrucoes §4/§6):** `HOSTGATOR_FTP_HOST` é o host real do servidor (não `ftp.<dominio>` atrás de CDN); baixar o `.htaccess` remoto, guardar cópia e **mesclar** sem apagar a proteção de senha; conferir tamanho local × remoto de cada arquivo (`0 divergência(s)`); nunca enviar dados em claro (sigilo) — em 451, reenviar sob TLS e, persistindo, consultar Max. 3) Verificar que a proteção de diretório do cPanel está ativa (feita por Max — ver checklist). 4) Rodar as provas do portão. Se a proteção não estiver ativa, **não** publicar conteúdo além de uma página vazia e avisar Max na mensagem consolidada (caso 4 do regime de autonomia).
Conclusão: URL responde 401 sem senha e 200 com senha; telas MMO e FPE abrem.
Qualidade: nenhum segredo no bundle.
Evidência: `curl -s -o /dev/null -w "%{http_code}" "$APP_URL"` → `401`; `curl -s -o /dev/null -w "%{http_code}" -u "$SMOKE_BASIC_USER:$SMOKE_BASIC_PASS" "$APP_URL"` → `200`; `grep -rEl "HOSTGATOR_FTP_PASS|SMOKE_BASIC" dist | wc -l` → `0`; `gitleaks detect --no-banner` → `no leaks found`.
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis, incluindo FTP/TLS/permissões/`.htaccess` + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 02.12 — HANDOFF_UPGRADE e CHANGELOG do MVP [Auto] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: fechar a Etapa 02.
Arquivos tocados: `handoffs/HANDOFF_UPGRADE.md`, `CHANGELOG.md`, `handoffs/instrucoes.md`.
Passos: 1) Preencher o handoff com provas. 2) Registrar `+1.0` no CHANGELOG (lançamento do MVP: MMO v02 e FPE). 3) Promover candidatos (seção 7 do instrucoes).
Conclusão: handoff preenchido; portão 02→03 verde.
Qualidade: cada item “verde” traz o comando e a saída reais.
Evidência: `grep -c "^## \[+1.0\]" CHANGELOG.md` → `>= 1`.

---

## ETAPA 03 — UPGRADES E VERSIONAMENTOS (tela POP, LLM, XLSX, backup versionado no servidor, migração)
Status: ⬜ A FAZER
Objetivo geral: completar as Etapas 08/09 do contrato, o backup versionado no servidor e a gestão de versões, sobre o MVP já no ar (hospedagem de Max), e preparar a migração para a hospedagem do contratante.
Versionamento: +0.1 = correções/melhorias | +1.0 = novas funcionalidades/serviços.
Modo predominante: [Auto] + [Goal]. Sessão nova, abrir com `HANDOFF_UPGRADE.md`.
Portão de entrada: portão 02→03 verde (repetido).
Observações: commit + push por subetapa; registrar em `handoffs/instrucoes.md` toda solução não trivial; `CHANGELOG.md` a cada funcionalidade nova (`+1.0`) ou melhoria (`+0.1`); o backup no servidor é **totalmente automatizável** (curl com `SMOKE_*`), portanto não há prova humana; o único gesto humano da etapa é o “aprovado” de Max para a migração (03.8).
**PORTÃO 03→entrega (na hospedagem de Max):** `npm test` → `0 failed` · `npm run e2e` → `passed` · `npm run dados:validar -- --v08 --fichas --bibliotecas` → 3 `OK` · `401` sem senha e `200` com senha, **inclusive em `/api/backups.php`** · `npm run backup:provar` → `OK backup: criar=201 listar=200 baixar=200 zip=200 excluir=200 onze=409 config=200` · `gitleaks` → `no leaks found` · teste de fallback do LLM verde. Enquanto vermelho, é **proibido** marcar a entrega como concluída. **A migração (03.8) só começa depois deste portão verde + “aprovado” de Max.**

### Subetapa 03.1 — Tela POP: perguntas estratégicas e geração por template [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: POP parcial (por setor) e geral, **sem LLM**, a partir do template fixo.
Arquivos tocados: `data/conteudo/perguntas_pop.json`, `pop_templates.json`, `pop_observacoes_juridicas.json`, `src/telas/pop/*`, `src/pop/gerar.ts`, `src/pop/gerar.test.ts`, `scripts/validar_dados.ts`.
Passos: 1) Escrever ≥ 8 perguntas estratégicas por setor com resposta-padrão pré-preenchida (`docs/06` §5). 2) Template com as 11 seções fixas (a 11 = Observações para revisão jurídica, sempre por último). 3) `gerar.ts`: montar POP setorial e geral a partir das fichas, condicionais, bibliotecas e respostas. 4) Tela: escolher setor(es), editar respostas, botão “Gerar POP do setor” / “Gerar POP geral”.
Conclusão: 12 POPs setoriais + 1 geral gerados com as 11 seções; seção 11 contém os 4 itens de `docs/06` §5.
Qualidade: texto curto, imperativo, sem inventar fato; diretrizes do CEO reproduzidas fielmente.
Evidência: `npm test -- pop` → `0 failed`; `npm run dados:validar -- --pop | tail -1` → `OK pop: setores=12 perguntas>=96 secoes=11`.
Esforço máximo do /goal: 5 tentativas.
Escalonamento de LLM: Sonnet nas 4 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 03.2 — Exportar POP em .docx e .pdf [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: POP em arquivo de texto entregável.
Arquivos tocados: `src/exportar/pop_docx.ts`, `src/exportar/pop_pdf.ts`, `scripts/verificar_docx.mjs`, `src/exportar/pop.test.ts`.
Passos: 1) `.docx` com a biblioteca `docx`: capa, sumário, 11 seções, rodapé com a nota de propriedade intelectual. 2) PDF por impressão (A4). 3) `verificar_docx.mjs` abre o arquivo gerado e conta seções.
Conclusão: `.docx` abre e contém 11 seções; PDF gera.
Qualidade: nomes `pop_<setor|geral>_<AAAA-MM-DD>.<ext>`; tipografia da marca no PDF.
Evidência: `npm test -- exportar` → `0 failed`; `node scripts/verificar_docx.mjs saidas_teste/pop_geral.docx` → `OK: secoes=11`.
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 03.3 — LLM: seletor padrão/particular, consentimento e fallback [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: redigir campos do POP com OpenRouter (padrão) ou chave do contratante; nunca travar.
Arquivos tocados: `src/llm/cliente.ts`, `src/llm/prompt.ts`, `src/llm/fallback.ts`, `src/llm/limite_gasto.ts`, `src/telas/pop/SeletorLlm.tsx`, `src/telas/pop/PainelLimiteGasto.tsx`, `src/llm/llm.test.ts`, `src/llm/limite_gasto.test.ts`, `src/llm/llm_texto.test.ts`.
Passos: 1) **Search-first:** confirmar a doc atual do OpenRouter e o modelo `:free` vigente; atualizar `VITE_OPENROUTER_MODELO_PADRAO` (valor real fica com Max; o CODE só sugere). 2) Checkbox “LLM padrão / LLM particular”; particular = campo para chave e (opcional) URL/modelo, guardada só em memória da sessão. 3) Aviso + checkbox de ciência antes do 1º envio; sem consentimento, nenhuma chamada. 4) Prompt fixo: usar somente o conteúdo fornecido; sem fatos, números, prazos ou nomes novos. 5) Tratamento de 402, 429, 404 e timeout → fallback determinístico (texto das respostas no template). 6) Contador local de uso diário com aviso perto do limite. 7) Saída do LLM sempre como **texto**. 8) **Painel “Limite de gasto da IA”** (`PainelLimiteGasto`): campos editáveis **teto mensal (R$)**, **alerta em (%)**, **limite diário de requisições** e, para a chave particular, **preço por 1 milhão de tokens (entrada e saída, em R$)** informado pelo contratante — o app não inventa preço. Mostra gasto estimado do mês (tokens reais devolvidos pela API × preço informado), barra de uso e botão “Zerar contador do mês”. 9) `limite_gasto.ts`: antes de cada chamada, se gasto estimado ≥ teto (ou requisições do dia ≥ limite) → **bloqueia a chamada e usa o fallback determinístico**, com aviso claro; ao atingir o percentual de alerta, exibe aviso. Teto padrão **R$ 0 = nenhuma chamada paga**; chave padrão `:free` segue permitida só pelo limite diário. 10) **Trava de ciência de custo:** subir o teto acima de R$ 0 exige checkbox “Entendo que o gasto é cobrado na minha conta do provedor” e digitar o novo valor duas vezes; reduzir é livre. Valores negativos, não numéricos ou acima de um teto de sanidade (R$ 10.000) são recusados. 11) Persistência: `config_llm` salvo no servidor pela API de backups (rotas `config_ler`/`config_gravar`, 03.5) com cópia em `localStorage` (`try/catch`); sem servidor, vale só o local. A chave da API **nunca** é gravada na configuração.
Conclusão: com LLM e sem LLM o POP sai; sem consentimento não há chamada; 429/402/404 caem no fallback.
Qualidade: nenhuma chave em log; nenhum HTML vindo do LLM é interpretado.
Evidência: `npm test -- llm` → `0 failed` (mocks de 200, 402, 429, 404, timeout, sem consentimento; **teto atingido bloqueia a chamada; teto editado no painel passa a valer; aumento sem ciência é recusado; gasto zera com “Zerar contador”**); `grep -rEl "sk-ant|sk-proj" dist | wc -l` → `0`; `grep -rn "LLM_TETO" src | wc -l` → apenas leituras do valor padrão embutido (nenhum teto fixo em código).
Esforço máximo do /goal: 5 tentativas.
Escalonamento de LLM: Sonnet nas 4 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 03.4 — Exportar XLSX (FPE e POP) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: tabelas do FPE (fichas por setor) e do POP em `.xlsx`.
Arquivos tocados: `src/exportar/xlsx.ts`, `src/exportar/xlsx.test.ts`.
Passos: 1) Uma aba por setor (fichas 5W1H) + abas de bibliotecas (documentos, ferramentas, investimentos, KPIs) + aba do POP geral. 2) Larguras e cabeçalhos com a marca.
Conclusão: `.xlsx` gerado; abas conferem com os dados.
Qualidade: sem fórmula quebrada; texto sem truncar.
Evidência: `npm test -- xlsx` → `0 failed` (abas = 12 setores + 4 bibliotecas + 1 POP geral).
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 03.5 — API PHP de backups versionados no servidor (limite 10) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: guardar, listar, baixar e excluir backups HTML no servidor do contratante, sem Google e sem custo. Substitui o antigo backup no Drive.
Arquivos tocados: `public/api/backups.php`, `public/api/.htaccess`, `scripts/deploy_ftp.ts` (gera `api/config.php`), `scripts/provar_backup.mjs`, `docs/07_BACKUP_NO_SERVIDOR.md`, `handoffs/instrucoes.md`.
Passos:
1. **Spike (≤ 20 min, na hospedagem de Max):** publicar `api/diagnostico.php` temporário que informa versão do PHP, `ZipArchive`, `REMOTE_USER`/`PHP_AUTH_USER`, `open_basedir` e se `BACKUP_DIR_SERVIDOR` é gravável; remover o arquivo em seguida. Registrar o resultado em `instrucoes.md`. Se `ZipArchive` faltar, o ZIP em lote passa a ser montado no navegador (biblioteca `fflate`); se `REMOTE_USER` faltar, aceitar `REDIRECT_REMOTE_USER` — nunca abrir a API sem a senha do diretório.
2. **Armazenamento:** cada backup = `bk_<AAAAMMDD_HHMMSS>_<8hex>.html` + `bk_..._meta.json` (`rotulo`, `escopo`, `criado_em`, `tamanho_bytes`, `sha256`, `versao_app`, `protegido`). Pasta `BACKUP_DIR_SERVIDOR`, de preferência **fora da raiz web**; se não der, dentro do diretório protegido com `.htaccess` `Require all denied` (downloads sempre passam pela API).
3. **Rotas** (`backups.php?acao=`): `listar` (GET), `criar` (POST, corpo = HTML + metadados), `baixar` (GET `id`), `baixar_zip` (POST `ids[]`), `excluir` (POST `ids[]`), `renomear` (POST `id`,`rotulo`), `proteger` (POST `id`,`valor`), `ver` (GET `id`, entrega o HTML com `Content-Security-Policy: sandbox` e `Content-Disposition: inline`), **`config_ler` (GET) e `config_gravar` (POST)** para o `config_llm` (arquivo `configuracao_llm.json` na pasta de dados, validado por esquema: só números dentro de faixas, nunca chaves de API). Toda resposta em JSON, exceto download/ver.
4. **Limite:** `BACKUP_LIMITE_MAX` (padrão 10; teto rígido 10 no código). `criar` com 10 já salvos → **HTTP 409** `{"erro":"limite_atingido","limite":10,"total":10}`; **nunca apagar em silêncio**. A interface oferece “excluir o mais antigo não protegido e salvar” como ação explícita, que chama `excluir` + `criar`.
5. **Segurança:** (a) exige usuário autenticado pelo diretório (senão 401); (b) mutações exigem o cabeçalho `X-Lux-Requisicao: 1` (bloqueia CSRF de outra origem) e `Content-Type` esperado; (c) `id` só aceito por regex `^bk_\d{8}_\d{6}_[0-9a-f]{8}$` — o nome de arquivo nunca vem do cliente (sem path traversal); (d) tamanho máximo por backup 5 MB e validação de que o corpo é HTML com o bloco `<script type="application/json" id="lux-estado">` válido; (e) escrita atômica (`.tmp` + `rename`) e `flock` na criação, para o limite não ser furado por duas requisições simultâneas; (f) sem `eval`, sem `unserialize`, sem execução de conteúdo do backup.
6. **Formato do backup (decisão técnica registrada):** HTML **autossuficiente e legível sem o app** (renderização estática do FPE e/ou POP, fonte e cores embutidas via tokens) contendo o estado em JSON (`estado_backup { schema_versao, fpe_edicoes, pop_respostas, gerado_em }`) no bloco `lux-estado`, o que permite **restaurar**. Sem PII e sem dados de lead.
7. `scripts/provar_backup.mjs`: usa `APP_URL` + `SMOKE_*` e percorre criar → listar → baixar → zip → proteger → excluir → criar 11 e conferir `409`; sai com exit 0 e limpa o que criou. Para desenvolvimento local: `php -S` se houver PHP; senão os testes de unidade usam mock de `fetch`.
Conclusão: ciclo completo funcionando na hospedagem de Max; 11º backup recusado; API 401 sem senha.
Qualidade: PHP sem dependências externas (Composer proibido); mensagens de erro em PT-BR simples; código PHP segue `snake_case` em português (exceção consciente à regra de TS: o servidor não roda Node).
Evidência: `npm test -- adversarial_api` → `0 failed` (portão adversarial: `../`, método errado, sem `X-Lux-Requisicao`, > 5 MB, HTML sem `lux-estado`, chave de API na config, 11º backup, criação simultânea, sem senha); `npm run backup:provar | tail -1` → `OK backup: criar=201 listar=200 baixar=200 zip=200 excluir=200 onze=409 config=200`; `curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/backups.php?acao=listar"` → `401`; mesmo `curl` com `-u "$SMOKE_BASIC_USER:$SMOKE_BASIC_PASS"` → `200`; `curl` com `id=../../.env` (autenticado) → `400`.
Esforço máximo do /goal: 5 tentativas.
Escalonamento de LLM: Sonnet nas 4 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis, incluindo `open_basedir`, permissões e `REMOTE_USER` + 2–3 alternativas, p. ex. WebDAV do cPanel ou salvar só por download manual); registrar em `handoffs/instrucoes.md` seção 5.

### Subetapa 03.6 — Tela “Versões salvas” (`#/versoes`) e botão “Salvar versão” [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: o contratante salva versões do FPE/POP e gere as versões anteriores em uma view própria.
Arquivos tocados: `src/telas/versoes/*`, `src/backup/cliente.ts`, `src/backup/gerar_html.ts`, `src/backup/estado.ts`, `src/telas/comum/SalvarVersao.tsx`, `src/backup/backup.test.ts`, `src/telas/versoes/versoes.test.tsx`, `e2e/versoes.spec.ts`.
Passos:
1. `SalvarVersao` (botão no FPE e no POP): pede rótulo opcional, gera o HTML (`gerar_html.ts`) a partir do estado local, envia via `cliente.ts`. Sem servidor (build offline, `localhost` sem PHP) → botão desativado com explicação e alternativa “Baixar arquivo”. Nenhuma perda de dado se o envio falhar.
2. **View `#/versoes`:** tabela com data/hora, rótulo, escopo (FPE/POP/completo), tamanho, versão do app, 🔒 protegido; contador **“n de 10 versões”** com aviso a partir de 8; estado vazio e estado de erro claros.
3. **Seleção:** checkbox por linha, “selecionar todas” (com estado indeterminado), seleção preservada ao reordenar/filtrar; ordenação por data, filtro por escopo e busca por rótulo.
4. **Ações unitárias:** pré-visualizar (nova aba, `ver`), baixar `.html`, restaurar (com confirmação, substitui o estado local — antes cria automaticamente um backup local em `localStorage` para desfazer), renomear rótulo, proteger/desproteger.
5. **Ações em lote (sobre os selecionados):** baixar `.zip`, excluir (diálogo de confirmação listando o que será apagado; itens protegidos ficam de fora e são avisados), proteger/desproteger em lote, **exportar índice** (JSON com metadados das versões). Comparar duas versões (diferença de campos do FPE/POP) fica no backlog.
6. Acessibilidade: tudo operável por teclado; `aria-label` nas ações; foco devolvido após excluir; contraste AA.
7. Ao receber 409 no “Salvar versão”, mostrar: “Limite de 10 versões atingido. Exclua versões antigas ou substitua a mais antiga não protegida.”
Conclusão: salvar → listar → selecionar (unitário e lote) → baixar/excluir/restaurar funcionam na produção de homologação; limite visível e respeitado.
Qualidade: nenhuma exclusão sem confirmação; HTML de backup nunca é injetado na página do app (pré-visualização só em aba separada e sandbox); textos sempre escapados.
Evidência: `npm test -- backup versoes` → `0 failed` (mocks: 200, 401, 409, erro de rede, item protegido); `npm run e2e -- versoes` → `passed` (salvar 10, 11º bloqueado, selecionar todos, excluir lote, baixar zip); `grep -rEn "drive|oauth|gapi" src -i | wc -l` → `0`.
Esforço máximo do /goal: 5 tentativas.
Escalonamento de LLM: Sonnet nas 4 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar em `handoffs/instrucoes.md` seção 5.

### Subetapa 03.7 — Build offline, guia do contratante e deploy final (homologação) [Auto] [Goal] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: fechar a entrega **na hospedagem de Max**.
Arquivos tocados: `docs/GUIA_DO_CONTRATANTE.md`, `docs/ENTREGA.md`, `CHANGELOG.md`, `handoffs/instrucoes.md`.
Passos: 1) `npm run build:single` → `dist-single/index.html` (LLM e backup no servidor desativados sem rede/servidor; “Baixar arquivo” continua). 2) `GUIA_DO_CONTRATANTE.md` (≤ 2 páginas: acessar, preencher, gerar, exportar, salvar e gerir versões — limite de 10 —, **baixar cópias para guardar fora do servidor**, limitações). 3) `ENTREGA.md`: mapa das 9 etapas do contrato → tela/arquivo, e a lista de pendências vigiadas para Max. 4) Deploy final e provas do portão. 5) CHANGELOG `+1.0`.
Conclusão: portão 03→entrega verde.
Qualidade: guia legível por quem não é técnico (frases curtas, sem jargão).
Evidência: `npm run build:single && test -f dist-single/index.html && echo ok` → `ok`; `curl` `401`/`200` como na 02.11; `npm run backup:provar | tail -1` → `OK backup: ...`; `npm test && npm run e2e` → `0 failed` e `passed`.
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis + 2–3 alternativas); registrar o caso em `handoffs/instrucoes.md` seção 5.

### Subetapa 03.8 — Migração para a hospedagem do contratante [Auto após aprovação] [LLM: Sonnet]
Status: ⬜ A FAZER
Objetivo: mover o sistema aprovado da hospedagem de Max para a do contratante, sem mudar código.
Portão de entrada: portão 03→entrega verde **e** mensagem “aprovado” de Max **e** credenciais/acessos da hospedagem do contratante (cPanel/FTP/subdomínio) entregues por Max — ausência = caso 1/4 do regime de autonomia (uma única mensagem).
Arquivos tocados: `docs/MIGRACAO.md`, `docs/CHECKLIST_MAX.md`, `.env` (só Max altera os valores), `handoffs/instrucoes.md`, `CHANGELOG.md`.
Passos: 1) `docs/MIGRACAO.md` com o checklist: subdomínio + https + proteção de diretório + PHP ≥ 8 na hospedagem do contratante; preencher `HOSTGATOR_*`, `APP_URL`, `SMOKE_*`, `APP_AMBIENTE=producao`. 2) Repetir o **spike da 03.5** (PHP, `ZipArchive`, `REMOTE_USER`, gravação) no novo servidor. 3) `npm run deploy` e as provas do portão (`401`/`200`, `backup:provar`). 4) Opcional, a pedido de Max: levar os backups existentes — `baixar_zip` na origem e importação manual pela tela `#/versoes` (botão “Importar versão” aceita `.html` de backup, respeita o limite de 10). 5) **Descomissionamento da hospedagem de Max (destrutivo → só com aprovação explícita de Max):** apagar o subdomínio de homologação, a pasta de backups e o `api/config.php`; até lá, manter a senha ativa (sigilo, Cl. 5.4/9). 6) Atualizar `CHANGELOG` (`+0.1`) e as pendências vigiadas.
Conclusão: URL do contratante responde `401`/`200`; ciclo de backup verde no novo servidor; descomissionamento concluído ou explicitamente adiado por Max.
Qualidade: nenhum segredo do ambiente antigo no repositório; nenhuma alteração em `src/`.
Evidência: mesmas provas da 02.11/03.5 apontando para a nova `APP_URL`; `git diff --stat -- src | wc -l` → `0`.
Esforço máximo do /goal: 4 tentativas.
Escalonamento de LLM: Sonnet nas 3 primeiras; na última, Opus.
Se esgotar: parar e emitir relatório curto (problema + causas prováveis, incluindo PHP antigo, `open_basedir`, permissões + 2–3 alternativas); registrar em `handoffs/instrucoes.md` seção 5.

---

## Pendências vigiadas
Débitos conhecidos e aceitos. O CODE deve relembrá-los em sessões futuras.
- [ ] Chave OpenRouter no bundle público — gatilho: HTTP 429 recorrente ou 402 — risco: terceiros esgotam a cota de 50 req/dia (sem cobrança).
- [ ] Modelos `:free` rotacionam sem aviso — gatilho: 404/modelo indisponível — risco: “LLM padrão” quebra (fallback cobre).
- [x] ~~Tela de consentimento OAuth em modo “teste”~~ — [OBSOLETA — Drive/OAuth descartado em 24/09/2026].
- [ ] Chave OpenRouter sob conta de Max — gatilho: fim do contrato/transferência — risco: dependência sem SLA (Cláusula 7 exclui atualizações). _(A parte “Projeto do Google Cloud” ficou [OBSOLETA — Drive descartado].)_
- [ ] Etapa 04 do contrato (validação com a Lux) não ocorreu — gatilho: qualquer contato retomado — risco: conteúdo `sugerido` sem validação formal.
- [ ] Revisão jurídica de “boleto”/parcela ≈ conta/IBS/afirmações técnicas — gatilho: antes da Lux usar o POP como script de venda — risco: passivo de comunicação comercial.
- [ ] 31 células IF/ELSE × 15 situações — gatilho: 01.4 — risco: contagem exibida divergir do que a Lux conhece.
- [ ] Licença de uso da fonte Cyntho Next — gatilho: publicar fora do escopo Lux — risco: uso indevido de asset de marca.
- [ ] Site sem monitoramento nem backup do servidor — gatilho: qualquer falha em produção — risco: indisponibilidade sem quem responda. **Agravante:** os backups HTML ficam no mesmo servidor do site; se a hospedagem for perdida, perdem-se juntos → o guia orienta baixar cópias periódicas (botão “baixar .zip”).
- [ ] API PHP de backups depende de PHP ≥ 8, `ZipArchive` e da senha de diretório do cPanel expondo o usuário autenticado — gatilho: spike da 03.5 (e de novo na 03.8) — risco: recurso de backup indisponível em outro servidor (plano B na própria subetapa).
- [ ] Homologação na hospedagem particular de Max contém dados operacionais da Lux (sigilo Cl. 5.4/9) — gatilho: aprovação e migração (03.8) — risco: dados ficarem no servidor de Max após a entrega; exige descomissionamento aprovado por Max e senha ativa até lá.
- [ ] Migração para a hospedagem do contratante ainda sem acessos — gatilho: “aprovado” de Max — risco: atraso da entrega; depende de cPanel/FTP do contratante.

## Backlog de versionamento (documento vivo)
Regra: só quebra o fluxo das etapas se impactar diretamente o MVP; caso contrário, aguarda a Etapa 03.
- [ ] Proxy para esconder a chave do LLM (n8n/Edge Function) — impacto no MVP? não — +1.0 (exige aprovação de custo/infra).
- [ ] Comprar US$ 10 em créditos OpenRouter (1.000 req/dia) — impacto? não — +0.1 (aprovação de Max).
- [ ] ~~Backup em segundo plano no Drive (exige backend e refresh token)~~ — [OBSOLETA — Drive descartado].
- [ ] Backup automático agendado (cron do cPanel chamando a API PHP) — impacto? não — +0.1.
- [ ] Comparar duas versões salvas (diff de campos do FPE/POP) na tela `#/versoes` — impacto? não — +0.1.
- [ ] Cópia externa dos backups (nuvem do contratante, por decisão dele) — impacto? não — +1.0 (hoje: baixar `.zip` e guardar manualmente).
- [ ] Login de usuários e permissões na ferramenta — impacto? não — +1.0.
- [ ] CRM próprio + agentes (fase futura, fora deste projeto) — impacto? não — +1.0.
