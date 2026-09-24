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

**Status da varredura:** _(preenchido pelo CODE na subetapa 01.0 — repo a repo, data e o que rendeu)_

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

_(preenchido pelo CODE na 01.0 a partir da varredura dos repositórios)_

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
- **Evidência:** `grep -rEl "FTP_PASS|SMOKE_BASIC" dist | wc -l` → `0`.
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

### O 11º backup não pode apagar nada em silêncio
- **Gatilho:** `criar` com 10 backups já salvos.
- **Ação:** responder 409 e deixar a interface pedir confirmação explícita (“excluir o mais antigo não protegido e salvar”); itens protegidos nunca entram na exclusão automática ou em lote.
- **Evidência:** `npm run backup:provar | tail -1` → `... onze=409`.
- **Fonte:** decisão de 24/09/2026; CLAUDE.md §0 (ação destrutiva).

## 7. Candidatos a promoção

- Pasta `data/` (fontes + conteúdo versionado) para projetos que são “ferramenta estática sobre dados curados”, sem banco — não existe no modelo de árvore da aurora-criativa.
- Regra “ler a planilha parando na legenda” + contagem esperada como teste de dados.
