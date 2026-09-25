# INSTRUÇÕES — LUX FERRAMENTAS OPERACIONAIS

Biblioteca viva de dicas técnicas deste projeto. Lida na abertura de toda sessão do CODE
e atualizada ao fim de toda subetapa que produza um aprendizado não trivial.

Formato de toda entrada: Gatilho → Ação → Evidência → Fonte.

---

## 0. Como usar este arquivo

- **Ao abrir uma sessão:** leia as seções 2 a 6 antes de agir. Elas contêm o que já custou tempo neste projeto.
- **Ao resolver um problema não trivial:** registre uma entrada nova na seção 5, no mesmo commit da correção.
- **Ao consultar um repositório da seção 1:** registre o que foi aproveitado (ou registre que não havia nada útil).
- Nunca apague uma entrada. Se ela ficar obsoleta, marque `[OBSOLETA — <motivo>]` e mantenha o histórico.

## 1. Repositórios de consulta

| Repositório | URL | O que oferece | Quando consultar |
|---|---|---|---|
| **superpowers** | https://github.com/obra/superpowers.git | Metodologia de desenvolvimento para agentes: planos de tarefas curtos, TDD, review em dois estágios, verificação antes de concluir. | Ao refinar subetapas, definir provas de conclusão, estruturar revisão. |
| **ECC** | https://github.com/affaan-m/ECC.git | Otimização de agentes: roteamento de modelo, economia de token, quality gates, formato de “instincts”. | Ao economizar token e decidir LLM por tarefa. |
| **hermes-agent** | https://github.com/NousResearch/hermes-agent.git | Agente de longo prazo (memória, cron, gateways). | **Não aplicável** a este projeto (sem agente). Registrar em uma linha. |
| **OpenClaw** | https://github.com/openclaw/openclaw.git | Agente 24h em servidor próprio. | **Não aplicável** (sem agente). Registrar em uma linha. |
| **Public-APIs** | https://github.com/public-apis/public-apis.git | Catálogo de APIs públicas e gratuitas. | Se surgir necessidade de API externa além de Drive/LLM. |
| **Build your own X** | https://github.com/codecrafters-io/build-your-own-x.git | Tutoriais de reconstrução. | **Uso restrito.** Nunca como diretriz de construção. |
| **Awesome-selfhosted** | https://github.com/awesome-selfhosted/awesome-selfhosted.git | Catálogo self-hosted. | Só se surgir necessidade de proxy/infra (hoje: backlog). |
| **React** | https://github.com/facebook/react | API oficial, hooks, padrões. | Antes de escrever componente contra memória. |
| **OS_Affiliate** | https://github.com/AuroraIAOS/OS_Affiliate.git | Projeto próprio: circuit breaker financeiro, aprovação manual antes de gasto. | Ao implementar o circuit breaker/fallback do LLM. |
| **CRM-Sindcom** | https://github.com/AuroraIAOS/CRM-Sindcom.git | Projeto próprio: React+TS+Vite, deploy FTP em HostGator, `.htaccess`, portões de fase, pendência vigiada. | **Prioritário aqui:** deploy FTP HostGator, `.htaccess`, testes como portão. |

**Status da varredura (01.0 — 24/09/2026, clone raso `--depth 1`, leitura apenas; nenhum código dos repositórios foi executado):**
| Repositório | Status | O que rendeu |
|---|---|---|
| **CRM-Sindcom** | ✅ consultado (prioritário) | Deploy FTP HostGator (host real × Cloudflare, erro 451, verificação de tamanho), `.htaccess` (HTTPS antes do fallback, HSTS curto, cache), blocos `.htaccess` gerenciados por software, portão adversarial. → seções 4 e 6. |
| **OS_Affiliate** | ✅ consultado | Circuit breaker aplicado **em código** (limite é valor de política, nenhuma LLM decide); pausa automática ao atingir o teto; aprovação humana antes de gasto. → seção 4. |
| **superpowers** | ✅ consultado | `verification-before-completion` (evidência antes de afirmar) — casa com o Status ✅ do CLAUDE.md §6. → seção 4. |
| **ECC** | ✅ consultado | Roteamento de modelo por complexidade (haiku/sonnet/opus) e `cost-aware-llm-pipeline` (rastreador de custo imutável, checagem antes da chamada, retry só em erro transitório). → seção 4. |
| **React** | ⏭️ não consultado agora | Consulta oficial (via context7) na 01.3 e na 02.7, antes de escrever componente. |
| **hermes-agent** | ➖ não aplicável | Sem agente neste projeto. |
| **OpenClaw** | ➖ não aplicável | Sem agente neste projeto. |
| **Public-APIs** | ➖ não aplicável | Drive descartado; só OpenRouter. (Nota: OS_Affiliate usa PTAX/BCB, gratuita e sem chave, para câmbio — só se um dia o preço do LLM vier em USD.) |
| **Build your own X** | ➖ não aplicável | Uso restrito (nunca como diretriz). |
| **Awesome-selfhosted** | ➖ não aplicável | Proxy/infra segue no backlog. |

## 2. Stack e tecnologias desta obra

**Travado no reference lock (24/09/2026):**
- React 18 + TypeScript + Vite; `HashRouter`; `react-hook-form` + `zod`; Vitest + Playwright.
- Mermaid para fluxogramas (+ fallback SVG de raias se o spike 01.5 reprovar).
- Exports no navegador: SheetJS (xlsx), `docx` (docx), PDF por impressão com CSS.
- Deploy: `basic-ftp` → HostGator (subdomínio https, diretório protegido por senha no cPanel).
- ~~Drive: Google Identity Services (token model), escopo `drive.file`.~~ [OBSOLETA — descartado em 24/09/2026 por dependência de conta/OAuth do contratante]
- Backup: `.html` autossuficiente + estado JSON embutido, salvo por API PHP mínima (`public/api/backups.php`) na hospedagem; limite 10; gestão em `#/versoes`.
- LLM: OpenRouter (modelo `:free`) ou chave do contratante; **fallback determinístico obrigatório**.

**Alternativas descartadas (não reabrir):**
- GitHub Pages (repo público expõe dados da Lux).
- Proxy n8n/Edge Function para esconder a chave (infra contínua sem contrato de manutenção → backlog).
- LLM como núcleo do POP (o template fixo é nosso; LLM só redige campos).
- Selo visível de proveniência (decisão de Max: preencher tudo sem marcação; `origem` só no JSON).
- Supabase/n8n/WhatsApp (fora de escopo).
- Google Drive/OAuth para backup (24/09/2026: exigiria conta Google do contratante e projeto Cloud sob Max).
- Deixar o teto do circuit breaker só no `.env` (24/09/2026: o contratante não acessa o `.env`; agora é editável no painel “Limite de gasto da IA”, com o `.env` como padrão inicial).
- Rotação automática (apagar o mais antigo sem perguntar) ao passar de 10 backups — destrutiva; a interface só oferece isso como ação explícita.

## 3. APIs e serviços de referência

| Serviço | Uso no projeto | Custo | Free tier / limite | Doc |
|---|---|---|---|---|
| OpenRouter (`:free`) | Redigir campos do POP | R$ 0 | 20 req/min; 50 req/dia sem crédito comprado (1.000/dia após comprar ≥ US$ 10 uma vez). Modelos free rotacionam sem aviso; 429 vem muitas vezes do provedor upstream. | https://openrouter.ai/docs/api_reference/limits |
| ~~Google Identity Services + Drive API~~ | [OBSOLETA — descartado em 24/09/2026] | — | — | — |
| PHP na hospedagem HostGator (cPanel) | API de backups (`public/api/backups.php`) | R$ 0 (já incluso) | Depende da versão do PHP, `ZipArchive`, `open_basedir` e do usuário autenticado (`REMOTE_USER`). Confirmar no spike da 03.5. | https://www.php.net/manual/pt_BR/ |
| Mermaid | Fluxograma + export `.mermaid` | R$ 0 | Biblioteca local. Grafo grande fica ilegível → spike 01.5. | https://mermaid.js.org |
| SheetJS | Export `.xlsx` | R$ 0 | Biblioteca local. | https://docs.sheetjs.com |
| `docx` (npm) | Export `.docx` do POP | R$ 0 | Biblioteca local. | https://docx.js.org |
| basic-ftp (npm) | Deploy FTP HostGator | R$ 0 | — | https://www.npmjs.com/package/basic-ftp |

Descartadas na sondagem de custo (nenhuma API paga necessária no núcleo): serviços de PDF/DOCX em nuvem, proxy de LLM próprio.

## 4. Padrões e boas práticas herdadas

### Deploy só termina com verificação de tamanho local × remoto
- **Gatilho:** ao escrever `scripts/deploy_ftp.ts` (02.11) ou ao migrar para a hospedagem do contratante (03.8).
- **Ação:** depois do envio, comparar o tamanho de **cada** arquivo de `dist/` com o remoto (com `basic-ftp`, `client.size()` — confirmar a API na 02.11, search-first). “Enviou sem erro” não prova que “chegou inteiro” (o 451 deixa arquivo com 0 bytes sem reclamar). Qualquer divergência → exit 1.
- **Evidência:** `npm run deploy | tail -1` → `0 divergência(s) de tamanho`.
- **Fonte:** CRM-Sindcom, `scripts/deploy.sh` e `docs/deploy.md` (24/09/2026).

### Nova superfície pública ⇒ portão adversarial antes de liberar
- **Gatilho:** ao concluir a API PHP de backups (03.5) — é o primeiro endpoint que grava no servidor.
- **Ação:** além do ciclo feliz, escrever ataques deliberados: `id` com `../`, método errado, mutação sem `X-Lux-Requisicao`, corpo acima de 5 MB, HTML sem `lux-estado`, `config_gravar` com chave de API, 11º backup, duas criações simultâneas (`flock`), acesso sem senha. A suíte funcional prova o comportamento pretendido; não prova a ausência de caminho não pretendido.
- **Evidência:** `npm test -- adversarial_api` → `0 failed` e `npm run backup:provar | tail -1` → `OK backup: ...`.
- **Fonte:** CRM-Sindcom, `docs/RELATORIO_07_PORTAO_ADVERSARIAL.md` (5 falhas reais achadas onde a suíte funcional estava verde).

### Limite de gasto é regra de código, não decisão de LLM
- **Gatilho:** ao implementar `src/llm/limite_gasto.ts` (03.3).
- **Ação:** teto e alerta são valores de configuração aplicados **antes** de cada chamada (bloqueio → fallback determinístico). Rastreador de gasto **imutável** (cada chamada devolve novo estado); retry só para erro transitório (429/timeout), nunca para 402 nem para teto atingido; modelo por complexidade (mecânico → barato; ambíguo/arquitetura → Opus), como o plano já faz nas tentativas de /goal.
- **Evidência:** `npm test -- limite_gasto` → `0 failed` (teto atingido ⇒ 0 chamadas; 402 ⇒ sem retry).
- **Fonte:** OS_Affiliate (`docs/00_PLANO_E_CRITERIOS.md`: circuit breaker, aprovação antes de gasto); ECC (`cost-aware-llm-pipeline`, `model-route`).

### Nada é “concluído” sem evidência fresca na mesma mensagem
- **Gatilho:** ao marcar `Status: ✅ CONCLUÍDA` (CLAUDE.md §6) ou escrever `status: verde` num handoff.
- **Ação:** identificar o comando de prova, rodá-lo por inteiro, ler a saída e o exit code, só então afirmar. Proibido “deve passar”, “provavelmente” ou reaproveitar execução antiga.
- **Evidência:** cada item verde do `HANDOFF_BUILD/UPGRADE` traz comando + saída reais (`grep -c "status: verde" handoffs/HANDOFF_BUILD.md` → `>= 5`).
- **Fonte:** superpowers, skill `verification-before-completion`.

## 5. Problemas e soluções deste projeto

### Ler a planilha parando na legenda
- **Gatilho:** ao percorrer `Matriz_Operacional.xlsx` linha a linha.
- **Ação:** encerrar a leitura na linha cuja coluna A contém “LEGENDA DE CORES”. As linhas seguintes (legenda, versão) são texto, não ações.
- **Evidência:** sem essa parada, a contagem dá 216 células (e o setor Cliente aparece com célula no Est. 01); com a parada, dá **212 células, 31 IF/ELSE**, e a presença setor × estágio bate com o MMO_v01.
- **Fonte:** estágio criativo (aurora-criativa), 24/09/2026.

## 6. Armadilhas conhecidas (não repetir)

### `VITE_` publica a variável
- **Gatilho:** ao criar qualquer variável de ambiente para o front-end.
- **Ação:** só usar `VITE_` para o que pode ser público (Client ID do Google, chave OpenRouter dedicada sem saldo). FTP e SMOKE **nunca** levam `VITE_`.
- **Evidência:** `grep -rEl "HOSTGATOR_FTP_PASS|SMOKE_BASIC" dist | wc -l` → `0`.
- **Fonte:** references da aurora-criativa (env_e_gitignore_templates).

### `.gitignore` ignora `*.xlsx`
- **Gatilho:** ao commitar `data/fontes/Matriz_Operacional.xlsx`.
- **Ação:** a exceção `!data/fontes/Matriz_Operacional.xlsx` já está no `.gitignore`. Não abrir outras exceções de `.xlsx`.
- **Evidência:** `git check-ignore -q data/fontes/Matriz_Operacional.xlsx; echo $?` → `1` (não ignorado).
- **Fonte:** estágio criativo.

### [OBSOLETA — Drive descartado em 24/09/2026] Google OAuth só funciona em origem https autorizada
- **Gatilho:** ao testar o login do Drive.
- **Ação:** registrar o subdomínio de produção (e `http://localhost:5173` para dev) em “Origens JavaScript autorizadas” do OAuth client. Abrir o `.html` do disco (`file://`) não funciona: o build offline desativa o Drive.
- **Evidência:** erro `origin_mismatch` no popup do Google sem o cadastro.
- **Fonte:** documentação do GIS (seção 3).

### [OBSOLETA — Drive descartado em 24/09/2026] Tela de consentimento em modo “teste”
- **Gatilho:** contratante não consegue autorizar, ou o backup para de funcionar após dias.
- **Ação:** publicar a tela de consentimento em produção (escopo `drive.file`) ou cadastrar o Gmail do contratante como usuário de teste (em teste, há limite de usuários e expiração de credenciais).
- **Evidência:** enquanto em modo teste, o login de um Gmail que não é usuário de teste falha com `access_denied`.
- **Fonte:** documentação do Google (Migration/OAuth).

### Modelos `:free` do OpenRouter somem
- **Gatilho:** erro 404/“model not found” ou resposta vazia.
- **Ação:** revalidar a lista de modelos gratuitos (search-first) e atualizar `VITE_OPENROUTER_MODELO_PADRAO`; o fallback determinístico deve cobrir a lacuna.
- **Evidência:** `curl -s https://openrouter.ai/api/v1/models | grep -o ":free" | wc -l` → `>= 1`.
- **Fonte:** OpenRouter (limits/modelos), consulta de 24/09/2026.

### Arquivos-fonte com CRLF e extensão enganosa
- **Gatilho:** ao ler `data/fontes/*.md`.
- **Ação:** normalizar `\r\n` → `\n` no parser. `Relatorio_Operacional_V07.md` veio como `.docx` mas é markdown; já foi renomeado.
- **Evidência:** `file data/fontes/Relatorio_Operacional_V07.md` → `UTF-8 Unicode text`.
- **Fonte:** estágio criativo.

### Nunca abrir a API de backups sem a senha do diretório
- **Gatilho:** ao publicar ou migrar `public/api/backups.php` para um servidor novo.
- **Ação:** confirmar (spike) que o diretório está protegido e que o PHP enxerga o usuário autenticado (`REMOTE_USER`/`REDIRECT_REMOTE_USER`); a API responde 401 se não enxergar. Mutações exigem `X-Lux-Requisicao: 1`; `id` só por regex; nome de arquivo nunca vem do cliente.
- **Evidência:** `curl` sem senha em `$APP_URL/api/backups.php?acao=listar` → `401`; com `id=../../.env` → `400`.
- **Fonte:** decisão de 24/09/2026 (replanejamento do backup); OWASP (path traversal/CSRF).

### Teto do LLM editável pelo contratante — sem abrir brecha de custo
- **Gatilho:** ao implementar o painel de limite de gasto (03.3) ou ao alterar `config_llm`.
- **Ação:** padrão R$ 0 vindo do `.env`; aumento só com ciência de custo e valor digitado duas vezes; faixa validada no cliente **e** no PHP; a chave de API nunca entra na config; gasto = tokens reais da resposta × preço informado pelo contratante (o app não inventa preço); teto atingido ⇒ fallback determinístico.
- **Evidência:** `npm test -- limite_gasto` → `0 failed`; `npm run backup:provar | tail -1` → `... config=200`.
- **Fonte:** decisão de 24/09/2026 (Max); CLAUDE.md §0 item 3.

### O 11º backup não pode apagar nada em silêncio
- **Gatilho:** `criar` com 10 backups já salvos.
- **Ação:** responder 409 e deixar a interface pedir confirmação explícita (“excluir o mais antigo não protegido e salvar”); itens protegidos nunca entram na exclusão automática ou em lote.
- **Evidência:** `npm run backup:provar | tail -1` → `... onze=409`.
- **Fonte:** decisão de 24/09/2026; CLAUDE.md §0 (ação destrutiva).

### FTP: usar o host real da hospedagem, não o do domínio
- **Gatilho:** conexão FTP expira sem erro claro.
- **Ação:** se o domínio está atrás de CDN (Cloudflare), `ftp.<dominio>` não repassa a porta 21. Usar o host do servidor exibido na URL do cPanel (porta 2083). Vale para a hospedagem de Max **e** para a do contratante (03.8): perguntar/confirmar o host real de cada uma.
- **Evidência:** `nslookup ftp.<dominio>` aponta para IP de CDN ⇒ errado; o `basic-ftp` conecta em < 10 s com o host real.
- **Fonte:** CRM-Sindcom, `orientacoes.md` §1.1 (`br998.hostgator.com.br` no lugar de `ftp.sindcompassos.org`).

### Erro 451 no canal de dados sob TLS — **adaptação: aqui os dados NÃO são públicos**
- **Gatilho:** upload termina com erro 451 ou arquivo com 0 bytes/parcial.
- **Ação:** no CRM-Sindcom a saída foi deixar o canal de **dados** em claro (`curl --ftp-ssl-control`), pois os assets eram públicos. **Neste projeto o `dist/` embute o conteúdo operacional da Lux (sigilo, Cl. 5.4/9): não usar dados em claro sem aprovação de Max.** Ordem: (1) reenviar o arquivo sob TLS (o 451 é intermitente); (2) reduzir a concorrência para 1 conexão; (3) verificar por tamanho (entrada de deploy acima); (4) só então propor a Max SFTP (porta 22, se o plano tiver) ou dados em claro como decisão dele (caso 6/2 do regime de autonomia).
- **Evidência:** deploy com `0 divergência(s) de tamanho`; nenhum flag de “dados em claro” no `scripts/deploy_ftp.ts` (`grep -c "ssl-control\|secure: false" scripts/deploy_ftp.ts` → `0`).
- **Fonte:** CRM-Sindcom, `orientacoes.md` §1.2 (adaptado ao sigilo deste projeto).

### O deploy NÃO pode sobrescrever o `.htaccess` que guarda a senha do diretório
- **Gatilho:** ao enviar `public/.htaccess` (HTTPS/cache) para um diretório protegido pelo cPanel.
- **Ação:** a “Privacidade de diretório” do cPanel grava as diretivas de senha (`AuthType`, `AuthUserFile`, `require valid-user`) no `.htaccess` do próprio diretório; um `PUT` cego apaga a proteção. O deploy deve **baixar o `.htaccess` remoto**, guardar cópia (`.htaccess.bak_AAAAMMDD`), preservar todo bloco gerenciado por software (Auth*, `# BEGIN … / # END …`, handler de PHP) e **mesclar** a nossa regra. Regra própria fica **fora** dos marcadores gerenciados, e o redirecionamento HTTPS **acima de tudo**. _(Comportamento do cPanel inferido do CRM-Sindcom e a confirmar no spike da 02.11/03.5 — não verificado ainda neste servidor.)_
- **Evidência:** após cada deploy, `curl -s -o /dev/null -w "%{http_code}" "$APP_URL"` → `401` (se voltar `200` sem senha, a proteção foi perdida ⇒ abortar e restaurar a cópia).
- **Fonte:** CRM-Sindcom, `orientacoes.md` §(`.htaccess` com blocos NFD EPC/WordPress) e `docs/htaccess_site_institucional_backup_2026-08-25.txt`.

### `.htaccess` do site: HTTPS antes de qualquer regra, HSTS curto, cache correto
- **Gatilho:** ao escrever `public/.htaccess` (02.11).
- **Ação:** `RewriteRule` de HTTP→HTTPS (301) **antes** de qualquer outra regra; HSTS com `max-age=86400` na primeira aplicação (subir para 1 ano depois de uma semana estável), **sem** `includeSubDomains`; `index.html` com `no-cache`; assets com hash `immutable`. Sem fallback de SPA: o roteamento é `HashRouter`. A API PHP (`/api/`) nunca pode ser cacheada (`Cache-Control: no-store`).
- **Evidência:** `curl -sI "http://<host>" | head -1` → `301`; `curl -sI "$APP_URL/index.html" -u ... | grep -i cache-control` → `no-cache`.
- **Fonte:** CRM-Sindcom, `public/.htaccess`.

### Site fora do ar depois de deploy verde ≠ deploy quebrado
- **Gatilho:** HTTP não responde (ex.: 521) logo após deploy com 0 divergências.
- **Ação:** antes de refazer build/deploy, distinguir: 521 = Cloudflare no ar e origem recusando; FTP responde? outros sites da mesma conta também caíram? Se for a hospedagem, esperar e refazer só a verificação HTTP.
- **Evidência:** `curl -o /dev/null -w '%{http_code}' https://<host>` e teste do FTP em separado.
- **Fonte:** CRM-Sindcom, `orientacoes.md` §1.3.

### O `.env` de Max é a referência dos nomes (`HOSTGATOR_*`) e o script nunca imprime valores
- **Gatilho:** Max reescreveu o `.env` trocando `FTP_*` por `HOSTGATOR_FTP_*`/`HOSTGATOR_REMOTE_DIR` e acrescentando `HOSTGATOR_DOMINIO` e `VITE_OPENROUTER_API_NAME`; as etiquetas `[OBRIGATÓRIA v01]` saíram dos comentários.
- **Ação:** adotar os nomes do `.env` nos documentos (não o contrário). O catálogo de status (`OBRIGATÓRIA v01` / `FUTURA` / `CONDICIONAL`) vive em `scripts/checar_env.mjs`, não nos comentários do `.env`. O script valida regras (https, porta, TLS, faixas, `VITE_` sem segredo) e imprime só `ok`/`PLACEHOLDER`/`AUSENTE` — nunca valores. `SMOKE_BASIC_*` só é usado a partir da 02.11 (prova 401/200): ausente, a 01.1 fica ⚠️ PENDENTE e o trabalho segue até lá.
- **Evidência:** `node scripts/checar_env.mjs | tail -1` → `OBRIGATÓRIAS v01: 17/17 preenchidas` (exit 0); `grep -rEl "HOSTGATOR_FTP_PASS|SMOKE_BASIC" dist | wc -l` → `0`.
- **Fonte:** decisão de 24/09/2026 (01.1).

### Proteger o docroot do subdomínio (pai) e publicar em subpasta
- **Gatilho:** `APP_URL` termina em `/intelligence/` e o docroot `/home2/maxwe196/lux.strategicepiphany.com` está vazio e sem proteção (verificado no cPanel em 24/09/2026).
- **Ação:** aplicar a “Privacidade de diretórios” no **docroot do subdomínio**; a ferramenta e a API vão em `intelligence/`. O `.htaccess` que o deploy escreve fica na subpasta e **não toca** no `.htaccess` do pai onde mora a senha — elimina o risco de o deploy apagar a proteção. `BACKUP_DIR_SERVIDOR` deve ficar **fora** do docroot (`/home2/maxwe196/lux_backups`), nunca sob `lux.strategicepiphany.com/`. Continuar mesclando o `.htaccess` da subpasta com o que já existir lá.
- **Evidência:** `curl -s -o /dev/null -w "%{http_code}" https://lux.strategicepiphany.com/intelligence/` → `401`; com `-u "$SMOKE_BASIC_USER:$SMOKE_BASIC_PASS"` → `200`.
- **Fonte:** cPanel de Max (Privacidade de diretórios, 24/09/2026); complementa a entrada sobre `.htaccess` gerenciado.

### `xlsx` do npm está defasado (0.18.5) e o npm bloqueia o pacote remoto do CDN
- **Gatilho:** instalar SheetJS na 01.3/03.4 com `npm i xlsx`.
- **Ação:** o registro npm está parado na 0.18.5 (vulnerável); o oficial é a 0.20.3 no CDN da SheetJS (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`). Nesta máquina o npm **recusou** dependência remota (`Fetching packages of type "remote" have been disabled`) — trava do próprio npm, **não contornada**. `xlsx` foi **adiado para a 03.4** (só lá é usado). Opções a decidir com Max na 03.4: habilitar a fonte remota conscientemente, ou vendorizar o `.tgz` verificado no repositório.
- **Evidência:** `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` → `npm error Refusing to fetch`; `npm view xlsx version` → `0.18.5`.
- **Fonte:** https://docs.sheetjs.com/docs/getting-started/installation/nodejs (consulta de 24/09/2026).

### Scaffold: decisões da 01.3 (React 18, oxlint, `base: './'`)
- **Gatilho:** `npm create vite@latest` gera React 19 e `oxlint`; o plano trava React 18 e cita ESLint.
- **Ação:** manter **React 18.3.1** (reference lock; não reabrir). Manter **oxlint** (vem no template, sem configuração e sem plugins extras — ESLint 10 exigiria typescript-eslint + plugins, contra “sem dependências além das listadas”). `vite.config.ts` com `base: './'` para funcionar em subpasta (`/intelligence/`) e no build de arquivo único. Scripts ainda não implementados falham com `exit 1` (nunca verde falso). `tsc -b` como `typecheck`. Vitest sem `globals`: registrar `afterEach(cleanup)` no `setup.ts`, senão o Testing Library duplica elementos entre testes.
- **Evidência:** `npm run typecheck && npm run lint && npm test && npm run build` → exit 0; `npm run e2e` → `1 passed`; `grep -n "\"react\":" package.json` → `^18.3.1`.
- **Fonte:** decisão técnica de 24/09/2026 (01.3); erro real observado ao rodar os testes.

### Ler o `.xlsx` sem SheetJS: zip + XML, e as cores da legenda são dado
- **Gatilho:** `scripts/xlsx_para_json.ts` (01.4) com o SheetJS do npm defasado/bloqueado (ver entrada do `xlsx`).
- **Ação:** ler o `.xlsx` como zip (`fflate`) + XML (`fast-xml-parser`, só devDependencies — nada disso vai ao bundle). Tratar `sharedStrings` com “runs” de texto formatado, normalizar `\r\n` → `\n` e resolver a cor da célula por `s` → `cellXfs` → `fills`. **A cor é informação:** verde `FFC8F7C5` = IF/ELSE (cruzar com o texto “(IF/ELSE)” e falhar se divergirem), lilás `FFE8DAEF` = Grupo de Fluxo WhatsApp (4 células). Parar na célula da coluna A que contém “LEGENDA DE CORES” (linha 42). IF/ELSE tem o formato `texto\n(IF/ELSE) A → a | B → b`; qualquer desvio falha com a referência da célula.
- **Evidência:** `npm run dados:gerar` → `celulas=212 if_else=31`; `npm test -- validar` → `0 failed` (inclui mutações que provam que os validadores detectam erro).
- **Fonte:** inspeção de `xl/styles.xml` e `sheet1.xml` na 01.4 (24/09/2026).

### O MMO_v01 legado permite comparar mais que presença
- **Gatilho:** regra 8 (`comparar_mmo_legado.ts`).
- **Ação:** cada pílula `.stage-pill` traz `.stage-sector-block` por setor com um `<li class="stage-action-item">` por ação; comparar **presença e quantidade de ações** por setor × estágio (mais forte que só presença). Resultado real: 100% igual à V07. Teste de sensibilidade obrigatório (remover/alterar um item deve reprovar).
- **Evidência:** `npx tsx scripts/comparar_mmo_legado.ts | tail -1` → `OK: MMO_v01 == Matriz V07`.
- **Fonte:** `data/fontes/legado/MMO_v01.html`.

### Testes de dados ficam no projeto TypeScript de Node
- **Gatilho:** `tsc -b` acusa `Cannot find name 'process'`/`node:fs` em testes que leem arquivos.
- **Ação:** `src/dados/*.test.ts` entram em `tsconfig.node.json` (com `types: ["node"]`) e saem de `tsconfig.app.json`; o teste usa `// @vitest-environment node`.
- **Evidência:** `npm run typecheck` → exit 0.
- **Fonte:** erro real da 01.4.

## 7. Candidatos a promoção

- Pasta `data/` (fontes + conteúdo versionado) para projetos que são “ferramenta estática sobre dados curados”, sem banco — não existe no modelo de árvore da aurora-criativa.
- Regra “ler a planilha parando na legenda” + contagem esperada como teste de dados.
