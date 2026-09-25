# ENTREGA — Lux Ferramentas Operacionais

_Fechamento da Etapa 03 (subetapa 03.7), 25/09/2026. Ambiente: hospedagem de Max (homologação), atrás de senha. A migração para a hospedagem do contratante (03.8) só começa com o “aprovado” de Max._

## 1. Escopo do contrato → onde está
| Item do escopo (Cláusula 1) | Onde está na ferramenta | Arquivos-fonte |
|---|---|---|
| 1. Avaliação das informações e fluxos | Matriz V08 (12 setores, 22 estágios, 236 ações, 37 decisões IF/ELSE) | `data/matriz_v08.json`, `docs/06` |
| 2. Mapa Mental Organizacional (MMO) | Tela **MMO** (`#/mmo`) | `src/telas/mmo/` |
| 3. Fluxograma (FPE) | **FPE** (`#/fpe`): fluxograma por setor e por fase; exports `.mermaid` e PDF A3 | `src/telas/fpe/`, `src/fluxograma/` |
| 4. Validação com a CONTRATANTE | **Não ocorreu** (pendência vigiada; ver 4) | — |
| 5. Detalhamento do MMO | Descrições dos estágios, funções, equipes, jornada do cliente e Anotações do CEO no MMO | `data/conteudo/mmo_v02.json`, `anotacoes_v08.json` |
| 6.a 5W1H | 236 fichas editáveis no **FPE** | `data/conteudo/fichas_5w1h.json` |
| 6.b Pessoas e funções | “Quem” de cada ficha e equipes por região | fichas, `mmo_v02.json` |
| 6.c Ações e serviços | Ações por setor × estágio (MMO e FPE) | Matriz V08 |
| 6.d Documentos | 28 documentos; aba **Documentos** do `.xlsx`; seção 5 do POP | `data/conteudo/documentos.json` |
| 6.e Ferramentas e recursos | 7 ferramentas; aba **Ferramentas**; seção 8 do POP | `ferramentas.json` |
| 6.f Investimentos | 6 categorias **sem valores**; aba **Investimentos** | `investimentos.json` |
| 6.g/6.h Métricas e formulários | 36 indicadores **sem metas** + formulário; aba **KPIs**; seção 9 do POP | `kpis.json` |
| 7. Análise integrada | Fluxograma por fase e por setor; decisões IF/ELSE por situação | `src/fluxograma/` |
| 8. POP por setor | **POP** (`#/pop`): 12 POPs com 11 seções; exports `.docx` e PDF | `src/pop/`, `data/conteudo/pop_*.json`, `perguntas_pop.json` |
| 9. POP geral | **Gerar POP geral** (mesma tela e mesmos exports); aba **POP geral** do `.xlsx` | `src/pop/gerar.ts` |

Além do contrato: **Versões salvas** (`#/versoes`, até 10 cópias no servidor), **Redação com IA** opcional com teto de gasto, exportação `.xlsx` e versão de **arquivo único** (`dist-single/index.html`, funciona do disco, sem servidor).

## 2. Provas do portão 03 → entrega (rodadas em 25/09/2026)
| Prova | Comando | Resultado |
|---|---|---|
| Testes | `npm test` | 0 falhas |
| Navegador de verdade | `npm run e2e` | todos passam (inclui API PHP real e arquivo único aberto do disco) |
| Dados | `npm run dados:validar -- --v08 --fichas --bibliotecas --pop` | 4 linhas `OK` |
| Proteção | `curl` em `$APP_URL` e em `$APP_URL/api/backups.php?acao=listar` | `401` sem senha; `200` com senha |
| Backup no servidor | `npm run backup:provar` | `OK backup: criar=201 listar=200 baixar=200 zip=200 excluir=200 onze=409 config=200` |
| API adversarial | `npm test -- adversarial_api` | 0 falhas (PHP 8.3 real; precisa de `npm run php:preparar` na 1ª vez) |
| Fallback da IA | `npm test -- llm` | 0 falhas (402, 429, 404, timeout, sem ciência, 3 modelos) |
| Segredos | `gitleaks detect --no-banner` · `grep -rEl "HOSTGATOR_FTP_PASS\|SMOKE_BASIC" dist` | sem vazamentos · `0` |
| Arquivo único | `npm run build:single && test -f dist-single/index.html && echo ok` | `ok` |
| Site de pé | `npx tsx scripts/smoke_remoto.ts` | MMO, FPE, POP e Versões abrem sem erro |

## 3. Como publicar de novo
`npm run build` → `npm run deploy` (FTPS, confere o tamanho de cada arquivo, prova 401/200 também na API e mescla o `.htaccess` sem tocar na senha) → `npm run backup:provar`. `api/config.php` é gerado do `.env` a cada deploy.

## 4. Pendências vigiadas (para Max)
1. **Chave da IA dentro do site** (`VITE_OPENROUTER_API_KEY` vai para o bundle): se aparecer erro 429/402 recorrente, troque a chave. Modelos `:free` rotacionam: se um sumir, o próximo da lista assume; a lista está em `data/conteudo/llm_modelos.json` (revalidar de tempos em tempos).
2. **Backups no mesmo servidor do site** e homologação com dados da Lux na hospedagem de Max (sigilo, Cl. 5.4 e 9): manter a senha ativa até a migração e o descomissionamento.
3. **Migração aguardando o seu “aprovado”** (03.8) e os acessos da hospedagem do contratante (ver `docs/CHECKLIST_MAX.md`).
4. **Etapa 04 do contrato não ocorreu:** o conteúdo sai sem validação formal; itens `sugerido` (inferências) existem só no JSON.
5. **Revisão jurídica pendente** das diretrizes “boleto”, parcela × conta, IBS e afirmações técnicas (seção 11 de todo POP).
6. **Licença da fonte Cyntho Next** (não publicar fora do escopo Lux) e **sem monitoramento nem backup do servidor**: o guia manda baixar o `.zip` das versões periodicamente.
7. **Dívida técnica:** `npm audit` acusa `lodash-es` (via `mermaid`); revisar quando houver correção.
8. **Conferir o `.env`:** os nomes dos 3 modelos ficaram como comentários `LLM_*` (sem efeito; a fonte é `llm_modelos.json`) e `VITE_OPENROUTER_MODELO_PADRAO` está vazio (correto: usa o JSON).

## 5. Próximo passo
Com o seu **“aprovado”** e os acessos do contratante: subetapa **03.8** (`docs/MIGRACAO.md`, a criar então) — repetir o spike de PHP, `npm run deploy`, `backup:provar`, e o descomissionamento só com nova aprovação sua.
