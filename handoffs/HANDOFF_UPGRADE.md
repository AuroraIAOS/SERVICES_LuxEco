# HANDOFF_UPGRADE — Lux Ferramentas Operacionais

_Preenchido pelo CODE ao fim da Etapa 02 (subetapa 02.12), em 25/09/2026. As provas abaixo foram executadas de novo nesta subetapa._

> **Atualização (fim da 03.7, 25/09/2026):** as subetapas 03.1 a 03.7 estão concluídas e o portão 03→entrega está verde na hospedagem de Max — leia `docs/ENTREGA.md` (mapa do contrato, provas e pendências). Falta só a **03.8 (migração)**, que espera o “aprovado” de Max e os acessos do contratante. O texto abaixo descreve o estado no fim da Etapa 02.

## Estado atual
MVP v01 (MMO v02 + FPE com exportações) **no ar** em `https://lux.strategicepiphany.com/intelligence/` (hospedagem particular de Max = homologação), atrás de senha e 100% verde. Repositório `AuroraIAOS/SERVICES_LuxEco` (**privado**), branch `main`, último commit de código: `5e80d82`. Gasto acumulado: **R$ 0**. Nova sessão para a Etapa 03 (POP, LLM, XLSX, API PHP de backups + tela `#/versoes`, migração). `CHANGELOG.md` tem a entrada `+1.0` do lançamento do MVP.

## Leitura de abertura
1. `CLAUDE.md` · 2. `docs/00_PLANO_E_CRITERIOS.md` (Tabela de Progresso; Etapa 03) · 3. `handoffs/instrucoes.md` (**seções 5 e 6**: as entradas de FPE, exportações e deploy são as que a Etapa 03 reaproveita) · 4. `docs/07_BACKUP_NO_SERVIDOR.md` · 5. `docs/05_COMPLIANCE_E_ETICA.md`.

## Regime de autonomia (continua valendo)
Sem novas aprovações. Perguntar a Max só nos 6 casos do `CLAUDE.md` §0, em uma única mensagem. **A 03.8 (migração) só começa com “aprovado” de Max.**

## O que está funcional (v01) — com a prova
- **Dados** (V08: 12 setores, 22 estágios, 236 ações, 37 IF/ELSE; 236 fichas 5W1H; bibliotecas) — prova: `npm run dados:validar | tail -1` → `OK v07: setores=12 estagios=22 celulas=212 if_else=31`; `--v08` → `OK v08: ... celulas=236 if_else=37 novos=24`; `--fichas` → `OK fichas: 236/236`; `--bibliotecas` → `OK bibliotecas: ... valores_brl=0`.
- **Tela MMO v02** (`#/mmo`) e **tela FPE** (`#/fpe`: edição, fluxograma por setor/fase, estado no navegador) — prova: `npm run e2e` → `13 passed`; `npx tsx scripts/smoke_remoto.ts` → MMO e FPE abrem no Chromium real com `SMOKE_BASIC_*`, 236 fichas, fonte da marca carregada, sem erros de console nem 4xx/5xx.
- **Exportações do FPE** (02.10): `.md` e PDF (A4) das fichas por setor/todos; `.mermaid` e PDF (A3 paisagem, tema claro) do fluxo por setor/fase; `.json` das edições com **importação** (confirmação + cópia do estado anterior) — prova: `npm test -- exportar` → 0 failed (ida e volta idêntica; Mermaid validado pelo parser real; contraste AA nos dois temas); `npm run e2e -- exportar` → `3 passed` (downloads reais; MediaBox A3 1190,55×841,89 pt e A4).
- **Deploy protegido** (02.11): `npm run deploy` → `8 arquivos conferidos: 0 divergência(s) de tamanho`; `prova: sem senha → 401; com SMOKE_BASIC → 200`; `DEPLOY OK`. Não apaga nada, não toca no `.htaccess` do pai, mescla o da subpasta.

## Portão 02→03
- `curl -s -o /dev/null -w "%{http_code}" "$APP_URL"` → `401`; com `-u "$SMOKE_BASIC_USER:$SMOKE_BASIC_PASS"` → `200` — verde
- `npm test` → `Test Files 14 passed (14) · Tests 304 passed (304)` — verde
- `npm run e2e` → `13 passed` — verde
- `dados:validar` (v08, fichas, bibliotecas) → 3 `OK` (acima) — verde
- `grep -rEl "HOSTGATOR_FTP_PASS|SMOKE_BASIC" dist | wc -l` → `0`; `gitleaks detect --no-banner` → `no leaks found`; `git ls-files | grep -c "^\.env$"` → `0` — verde
- `grep -c "^## \[+1.0\]" CHANGELOG.md` → `1` — verde

## Fatos do servidor verificados na 02.11 (resolvem pendências da 03.5)
PHP **8.3.33**, `ZipArchive` presente, `REMOTE_USER` visível ao PHP (usuário autenticado identificável), escrita possível **fora do docroot** (`/home2/maxwe196/lux_backups`). A raiz do FTP é o docroot do subdomínio (com o `.htaccess` do pai e a senha). Sonda reutilizável: `npx tsx scripts/sonda_php.ts` (envia e remove sozinha). Falta na 03.5 apenas criar a API e provar `criar/listar/…/onze=409`.

## Backlog de versionamento herdado
- +0.1: fluxograma longo quebra entre páginas A3 sem respeitar cartões (Vendas ≈ 4 páginas); HSTS `max-age=86400` subir para 1 ano após uma semana estável; `http://` responde 401 antes do redirecionamento (aceitável).
- +1.0 (Etapa 03): tela POP (03.1–03.2), LLM com circuit breaker (03.3), XLSX/DOCX (03.4), backup no servidor + `#/versoes` (03.5–03.6), migração (03.8, só com “aprovado”).

## Credenciais a providenciar para esta etapa
- `VITE_OPENROUTER_API_KEY` — preenchida; `VITE_OPENROUTER_MODELO_PADRAO` — **placeholder/vazia** (definir na 03.3 com search-first); `BACKUP_LIMITE_MAX`, `BACKUP_DIR_SERVIDOR` — preenchidas. (Google/OAuth: [OBSOLETA].) `LOG_NIVEL` ausente (condicional, não bloqueia).

## Dívidas técnicas / riscos conhecidos
- **`xlsx` (SheetJS) bloqueado** pelo npm desta máquina (`allow-remote = none`) e o do registro está defasado: decidir com Max na 03.4 (habilitar fonte remota ou vendorizar o `.tgz`) — caso 4 do §0.
- Exportar/importar/edições vivem no navegador (localStorage): o backup no servidor (03.5) precisa embutir o mesmo `estado` (`src/estado/armazenamento.ts`, `src/exportar/json.ts`).
- Sem rasterizador de PDF nesta máquina: PDFs conferidos por captura em mídia `print` + MediaBox.

## Pendências vigiadas
- Chave OpenRouter no bundle público (429/402) · modelos `:free` rotativos · backups no mesmo servidor do site · homologação com dados da Lux na hospedagem de Max (sigilo) · migração aguardando “aprovado” de Max · Etapa 04 do contrato sem validação · revisão jurídica “boleto”/IBS · licença da fonte Cyntho Next · site sem monitoramento nem backup do servidor. (~~API PHP: PHP ≥ 8/`ZipArchive`/usuário autenticado~~ — confirmados na 02.11; falta só a prova da 03.5.)

## Candidatos a promoção (seção 7 do instrucoes.md)
- Pasta `data/` (fontes + conteúdo versionado) para “ferramenta estática sobre dados curados”, sem banco.
- Regra “ler a planilha parando na legenda” + contagem esperada como teste de dados.
- **Novo:** cores de texto derivadas dos tokens com contraste WCAG medido por teste (`corLegivel`), em vez de olho — vale para qualquer projeto com paleta de marca e tema claro/escuro.
- **Novo:** script de deploy FTPS que só lê o destino do `.env`, mescla `.htaccess` sem perder a senha do cPanel e prova 401/200 no fim (com modo `--sondar`).
- **Novo:** o e2e pega o que o teste de unidade não pega (formulário RHF não refletia a importação): sempre um e2e do fluxo completo de importar/restaurar.

## Regras
- Sessões separadas; ponte = repo + este handoff + `handoffs/instrucoes.md`.
- Toda solução nova continua registrada em `handoffs/instrucoes.md`.
- Máquina: nunca criar arquivos com heredoc/`node -e` com template literals; nunca `foo.ts` e `Foo.tsx` na mesma pasta; matar servidores 4173/5199.

## Primeiro passo sugerido da Etapa 03
- Subetapa 03.1 — tela POP e geração por template (sem LLM).
