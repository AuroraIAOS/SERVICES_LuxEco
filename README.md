# Lux Ferramentas Operacionais

Ferramenta web (HTML/React) que entrega à Lux Eco Solutions & Energy os produtos das Etapas 05–09 do contrato de consultoria: **MMO v02**, **FPE** e **POPs** — todos derivados de uma única fonte de dados (`data/matriz_v08.json`).

## Problema e persona
- **Cliente:** Luan (CEO) e equipe da Lux — precisam formalizar o know-how operacional para expandir com organização.
- **Consultor (Max):** não tem mais acesso ao contratante. A ferramenta entrega tudo pré-preenchido com o que já se sabe e deixa o contratante completar, ajustar e exportar.

## Visão geral
| Tela | O que faz |
|---|---|
| **MMO v02** | Mapa mental organizacional refeito do JSON, com as Anotações do CEO integradas (Etapa 02/05 do contrato). |
| **FPE** | Formulário 5W1H por setor × estágio (pré-preenchido e editável) → fluxograma gerado → exportação JSON/MD/MERMAID/PDF/XLSX + salvar versão no servidor (Etapas 03/06/07). |
| **POP** | Perguntas estratégicas por setor (pré-preenchidas) → POP parcial por setor e POP geral (template fixo + LLM só para redigir) → exportação .docx/.pdf + salvar versão no servidor (Etapas 08/09). |
| **Versões salvas** | Gestão dos backups HTML guardados no servidor (máx. 10): listar, selecionar unitário/em lote, baixar, excluir, restaurar. |

Identidade visual: marca Lux (chumbo `#181F28`, amarelo `#F3C51E`, Cyntho Next). Ver `docs/04_DESIGN_E_MARCA.md`.

## Escopo do MVP (Etapas 01–02 do CODE)
- `matriz_v07.json` gerado da planilha + `matriz_v08.json` (Anotações integradas).
- Fichas 5W1H completas (uma por célula da Matriz), bibliotecas de documentos/ferramentas/investimentos (sem valores em R$)/KPIs.
- Telas **MMO v02** e **FPE** com exports locais (JSON/MD/MERMAID/PDF).
- Deploy no HostGator (subdomínio https, protegido por senha no cPanel) — **primeiro na hospedagem particular de Max (homologação); migração para a do contratante só após aprovação**.

## Fora do MVP (Etapa 03)
Tela POP + geração de texto (LLM OpenRouter/chave própria, com fallback), export .docx, export XLSX, backup HTML versionado no servidor (máx. 10) + tela “Versões salvas”, build `.html` offline, migração para a hospedagem do contratante. _(Google Drive foi descartado em 24/09/2026.)_

## Fora do escopo do projeto
IA comercial, CRM, n8n/Supabase/WhatsApp — pertencem a outra fase e a outro chat. O `matriz_v08.json` fica apenas como base reaproveitável.

## Como rodar
Requisitos: Node ≥ 20 (testado com 24) e npm. O `.env` é local e nunca vai ao Git (ver `docs/CHECKLIST_MAX.md`).

```bash
npm install                # dependências (React 18, Vite, Vitest, Playwright…)
npx playwright install chromium   # só na primeira vez, para o e2e
npm run dev                # http://localhost:5173/#/mmo
npm run typecheck && npm run lint && npm test && npm run build   # portão de qualidade
npm run e2e                # sobe o build em :4173 e testa as rotas no Chromium
npm run build:single       # dist-single/index.html (arquivo único, offline)
npm run tokens:gerar       # regenera src/estilos/tokens.css a partir de design/tokens.json
npm run env:checar         # confere o .env sem mostrar valores
```

Rotas (`HashRouter`): `#/mmo`, `#/fpe`, `#/pop`, `#/versoes`. No `npm run dev` há também `#/guia`, o guia de estilo dos componentes
(`src/ui/`); ele **não entra** no build de produção. Scripts de deploy, spike e backup existem como
marcadores e **falham de propósito** (`exit 1`) até a subetapa que os implementa — assim nenhum portão passa por engano.

## Status e documentos-chave
- Roteiro: [`docs/00_PLANO_E_CRITERIOS.md`](docs/00_PLANO_E_CRITERIOS.md)
- Histórico: [`CHANGELOG.md`](CHANGELOG.md)
- Biblioteca técnica viva: [`handoffs/instrucoes.md`](handoffs/instrucoes.md)
- Conteúdo, conflitos entre fontes e regras de preenchimento: [`docs/06_CONTEUDO_E_RECONCILIACAO.md`](docs/06_CONTEUDO_E_RECONCILIACAO.md)

## Confidencialidade
Repositório **privado**. O contrato (`referencias_privadas/`) contém RG/CPF e nunca vai ao remoto. Propriedade intelectual das metodologias: Cláusulas 9, 10, 13 e 14 do contrato (ver `docs/05_COMPLIANCE_E_ETICA.md`).
