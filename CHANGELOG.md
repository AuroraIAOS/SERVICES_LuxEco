# CHANGELOG

Convenção: `+0.1` = correções/melhorias · `+1.0` = novas funcionalidades/serviços.
Registra **o que mudou para o usuário**; o *como resolvemos* fica em `handoffs/instrucoes.md`.

## [+0.1] - 2026-09-24 (Etapa 02 — em andamento)
- Matriz V08 composta: as Anotações do CEO entram no MMO como 24 ações novas e 6 condicionais IF/ELSE novas (atendimento por perfil de cliente, formas de pagamento, pós-venda), mais perfis de cliente, classificação de lead (quente/morno/frio), 10 oportunidades e respostas-padrão de atendimento. Os 12 setores, os 22 estágios e as 212 ações da V07 seguem iguais.
- Fichas 5W1H da Fase 1 — Comercial (Est. 01 a 09): 110 fichas, uma por ação, com quem, o quê, por quê, onde, quando e como (as condicionais IF/ELSE vêm descritas no “como”). Sem valores em R$ e sem prazos inventados; onde os documentos não definem algo (ex.: canal de contato antes do contrato), a ficha diz isso.

## [+0.1] - 2026-09-24 (Etapa 01 — fundação técnica)
- Projeto Vite + React + TypeScript criado, com as rotas `#/mmo`, `#/fpe`, `#/pop` e `#/versoes` (ainda em construção), tema e fonte da marca Lux.
- Matriz Operacional V07 lida da planilha (12 setores, 22 estágios, 212 ações, 31 condicionais IF/ELSE) e conferida contra o MMO_v01 legado.
- Fluxogramas: definido o formato de raias por fase e estágio, legível em A3 (o Mermaid não coube).
- Proteções do repositório: varredura de segredos e bloqueio de dados pessoais antes de cada commit.

## [+0.1] - 2026-09-24 (replanejamento)
- Backup no Google Drive **descartado**; no lugar, backups HTML versionados no próprio servidor (máx. 10) e nova tela “Versões salvas” (`#/versoes`) para listar, selecionar em lote, baixar e excluir. Plano, arquitetura, modelo de dados, compliance e handoffs atualizados.
- Limite de gasto da IA passa a ser configurável na ferramenta (painel na tela POP: teto mensal, alerta em %, limite diário, preço por tokens), com R$ 0 como padrão e o `.env` só como valor inicial.
- Construção e homologação na hospedagem particular de Max; migração para a hospedagem do contratante só após aprovação (subetapa 03.8).

## [+0.1] - 2026-09-24
- Fundação criada pelo estágio criativo (aurora-criativa): árvore de pastas, documentos de referência, `.gitignore`, `.env`, handoffs e plano de execução.
- Fontes de dados copiadas para `data/fontes/` (Matriz V07, Mapa, Relatório, Anotações do CEO, MMO_v01 legado).
- Fontes da marca (Cyntho Next Thin/ExtraBold) extraídas do MMO_v01 para `design/fontes/`.
