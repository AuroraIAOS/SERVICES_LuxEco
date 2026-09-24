# 01 — ARQUITETURA

## Visão geral (v01)
SPA estática + **uma API PHP mínima só para backups** (mesma hospedagem, mesma senha de diretório). Tudo roda no navegador do contratante; dados de negócio vêm de `data/matriz_v08.json` + `data/conteudo/*.json`, embutidos no build. Persistência local do que o contratante edita (`localStorage`) + **backups HTML versionados no servidor, no máximo 10** (Etapa 03). Sem Google/Drive (descartado em 24/09/2026).

```
data/fontes/*.xlsx|md ──scripts──▶ data/matriz_v07.json ─┐
data/fontes/Anotacoes  ─overlay──▶ data/matriz_v08.json ─┼─▶ Vite build ─▶ dist/ ─FTP─▶ HostGator (subdomínio https + senha cPanel)
data/conteudo/*.json (fichas 5W1H, bibliotecas, KPIs) ────┘                       │
                                                                                    ▼ navegador
                                       telas #/mmo · #/fpe · #/pop · #/versoes ── exports locais (JSON/MD/MERMAID/PDF/XLSX/DOCX)
                                                                   ├─ LLM: OpenRouter (padrão) ou chave própria  → só para redigir texto
                                                                   └─ /api/backups.php (PHP, atrás da mesma senha) → pasta de backups no servidor (máx. 10 .html + meta)
```

## Stack essencial v01
- **Base:** React 18 + TypeScript + Vite (padrão de Max). Tailwind é opcional: os tokens da marca em CSS variables têm prioridade. Sem shadcn/ui (não há necessidade).
- **Rotas:** `HashRouter` — funciona em hospedagem estática sem regra de rewrite.
- **Fluxogramas:** Mermaid (gera `.mermaid` de graça). Fallback decidido no spike 01.5: SVG de raias próprio (`src/fluxograma/raias.ts`).
- **Exports (todos no navegador, sem API paga):** JSON/MD/MERMAID (texto) · PDF por impressão com CSS `@page` · XLSX com SheetJS · DOCX com a biblioteca `docx`.
- **Testes:** Vitest (unidade) + Playwright (e2e das telas). **Qualidade:** `tsc --noEmit`, ESLint.
- **Backups no servidor:** `public/api/backups.php` (PHP ≥ 8, sem Composer) + view `#/versoes`. Ver seção abaixo e `docs/07_BACKUP_NO_SERVIDOR.md`.
- **Deploy:** `basic-ftp` para o FTP do HostGator (destino só pelo `.env`). Build extra `vite-plugin-singlefile` → `dist-single/index.html` (cópia offline; LLM e Drive ficam desativados sem rede).

## Divergências do stack padrão de Max (justificativa registrada)
- **Sem Tailwind/shadcn:** a marca tem tokens próprios (`docs/04`) e são só 3 telas; CSS variables + CSS modules bastam e reduzem peso.
- **Sem TanStack Query/Table:** não há servidor nem tabelas grandes; os dados são JSON local.
- **PHP no servidor só para backups:** site estático não grava em disco; PHP é o que a hospedagem compartilhada já oferece a R$ 0. Escopo estrito de 1 arquivo; sem framework, sem banco.
- **Sem Supabase/PWA/n8n:** sem banco, sem instalação no celular e sem automação neste escopo. Mantidos: React + TS + Vite, `react-hook-form` + `zod` (formulários 5W1H/POP).

## Ambientes e migração (decisão de 24/09/2026)
| Fase | Onde | `APP_AMBIENTE` | Quem decide a passagem |
|---|---|---|---|
| Construção e homologação | Hospedagem **particular de Max** (HostGator, subdomínio próprio, senha no cPanel) | `homologacao` | — |
| Entrega | Hospedagem **do contratante** | `producao` | Max, com “aprovado” explícito (subetapa 03.8) |

O código é o mesmo nos dois ambientes; muda só o `.env` (`FTP_*`, `APP_URL`, `SMOKE_*`, `APP_AMBIENTE`). A migração repete o spike de PHP/`ZipArchive`/usuário autenticado e as provas de `401`/`200`. Após a migração, a hospedagem de Max é descomissionada (com aprovação).

## Decisão de hospedagem (ordem de preferência por custo)
1. **Hospedagem que Max já paga (HostGator)** — escolhida para homologação e, depois, equivalente na do contratante: subdomínio dedicado, https, **diretório protegido por senha no cPanel** (“Privacidade de diretório”), PHP ≥ 8. Custo adicional: R$ 0.
2. GitHub Pages — descartado: no plano gratuito exige repositório público, o que exporia os dados operacionais da Lux.
3. Serverless/VPS — descartado no v01 (infra contínua num contrato fechado que exclui atualizações — Cláusula 7).

**Por que senha importa:** os dados da Lux ficam dentro do código da página. Quem tiver o link veria tudo. A senha do cPanel é a barreira real; senha “no front” seria só cosmética.

## Circuit breaker financeiro
- **Teto mensal padrão: R$ 0**, **ajustável pelo contratante no painel “Limite de gasto da IA”** (tela POP). O `.env` (`LLM_TETO_MENSAL_BRL`, `LLM_ALERTA_EM_PERCENTUAL`) é só o valor inicial embutido no build; o valor efetivo (`config_llm`) é salvo no servidor pela API de backups, com cópia local. Aumentar o teto exige ciência de custo; a chave nunca entra na configuração. Só free tier do OpenRouter (modelos `:free`: 20 req/min e 50 req/dia sem crédito comprado).
- **Alerta:** qualquer HTTP 402 (crédito) ou 429 recorrente → a ferramenta cai para o **fallback determinístico** (POP sai com o texto das respostas no template, sem polimento). Nunca fica parada.
- **Exige aprovação manual de Max:** comprar crédito OpenRouter (ex.: US$ 10 para subir a 1.000 req/dia), qualquer plano pago, proxy/servidor, domínio novo, qualquer serviço com custo.
- **Chave OpenRouter dedicada, sem saldo** (limite de gasto US$ 0 na própria chave). Risco residual aceito: por estar no bundle, terceiros podem esgotar a cota diária — não geram cobrança.

## LLM por função
| Função | Onde | Modelo |
|---|---|---|
| Redigir texto curto de campo do POP | Tela POP, botão “Redigir” | OpenRouter `:free` (padrão) **ou** API do próprio contratante |
| Todo o resto (template, montagem, exports, fluxograma) | Código determinístico | — (sem LLM) |

Guardrails do prompt fixo: usar **somente** o conteúdo fornecido; não acrescentar fatos, números, prazos ou nomes; manter o sentido; saída em PT-BR curta. Aviso + checkbox de ciência antes do 1º envio (dados vão a terceiros).

## Google Drive — [OBSOLETA — descartado em 24/09/2026]
Motivo: OAuth exigiria projeto Google Cloud e a conta Google do contratante, que Max não tem. Substituído pelo backup no servidor (abaixo). O contratante pode baixar os `.html`/`.zip` e enviá-los manualmente à nuvem que preferir.

## Backup versionado no servidor (Etapa 03 — subetapas 03.5 e 03.6)
- **O que é um backup:** um `.html` autossuficiente (legível sem o app) com a renderização estática do FPE/POP e o estado em JSON embutido (`<script type="application/json" id="lux-estado">`), que permite restaurar. Tamanho máx. 5 MB.
- **Onde fica:** `BACKUP_DIR_SERVIDOR` (padrão `../lux_backups`, fora da raiz web; plano B: dentro do diretório protegido com `Require all denied`). Cada backup tem `bk_<AAAAMMDD_HHMMSS>_<8hex>.html` + `..._meta.json`.
- **Limite:** **10** (`BACKUP_LIMITE_MAX`, teto rígido no código). O 11º é recusado com HTTP 409; a interface oferece “excluir o mais antigo não protegido e salvar” como ação explícita. Nunca há exclusão silenciosa.
- **Segurança:** a API fica dentro do diretório protegido por senha do cPanel (401 sem senha); mutações exigem o cabeçalho `X-Lux-Requisicao: 1` e `id` validado por regex (o cliente nunca informa nome de arquivo); escrita atômica com `flock`; pré-visualização com `Content-Security-Policy: sandbox`.
- **Gestão:** tela `#/versoes` — listar, selecionar (unitário/todos), baixar `.html`/`.zip`, excluir (com confirmação), restaurar, renomear, proteger, exportar índice.
- **Sem servidor** (build offline, `localhost` sem PHP): o botão “Salvar versão” se desativa e oferece “Baixar arquivo”.
- **Risco aceito:** backups no mesmo servidor do site não protegem contra perda da hospedagem → guia orienta baixar cópias periódicas.

## O que fica para depois do MVP
POP + LLM, export XLSX, backup versionado no servidor + tela de versões, build offline, migração (tudo na Etapa 03). Fora do projeto: CRM, agentes, n8n, Supabase.
