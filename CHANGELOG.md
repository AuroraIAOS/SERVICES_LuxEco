# CHANGELOG

Convenção: `+0.1` = correções/melhorias · `+1.0` = novas funcionalidades/serviços.
Registra **o que mudou para o usuário**; o *como resolvemos* fica em `handoffs/instrucoes.md`.

## [+1.0] - 2026-09-25 (Etapa 03 — em andamento)
- Tela POP (`#/pop`): escolha do setor, 9 perguntas estratégicas por setor (108 no total) já respondidas com o que os documentos da Lux dizem e editáveis (guardadas no navegador; “Restaurar resposta-padrão”), e geração do **POP do setor** ou do **POP geral** com as 11 seções fixas, sem IA. O procedimento usa as fichas do FPE com as suas edições. As diretrizes do CEO (“boleto”, parcela × conta de energia, credenciamento IBS, afirmações sobre o telhado) aparecem como ele as formulou e estão listadas na seção 11, “Observações para revisão jurídica” (sinalização, não parecer jurídico). Redação com IA (opcional): em cada pergunta, “Redigir com IA” propõe uma versão mais clara do texto que você já tem; ela só entra na resposta se você aceitar. Usa modelos gratuitos, com troca automática para o próximo se um falhar, ou a sua própria chave (que fica só na memória da página). Só envia depois de você marcar a ciência de que o texto vai a um provedor externo, descarta qualquer sugestão que traga número, prazo ou valor novo e, se a IA não responder, o POP sai igual pelo template. O painel “Limite de gasto da IA” mostra o uso e permite ajustar teto mensal (padrão R$ 0,00: nenhuma chamada paga), alerta, limite diário e os modelos; aumentar o teto exige ciência de custo e digitar o valor duas vezes. Cada POP pode ser exportado em Word (`.docx`, com capa, sumário, 11 seções e rodapé com a nota de propriedade intelectual) e em PDF A4, com o nome `pop_<setor|geral>_<data>`.

## [+1.0] - 2026-09-25 (Lançamento do MVP: MMO v02 e FPE)
- Primeira versão utilizável da ferramenta, no ar na hospedagem de homologação e protegida por senha: **MMO v02** (mapa da operação em painel, com as Anotações do CEO) e **FPE** (236 fichas 5W1H editáveis, fluxogramas por setor e por fase, exportação em Markdown, PDF, Mermaid e JSON, com importação das suas edições). O detalhe de cada parte está nas entradas +0.1 abaixo. Ainda não inclui a tela POP, a redação com IA, as exportações Excel/Word, os backups no servidor nem a migração (Etapa 03).

## [+0.1] - 2026-09-24 (Etapa 02 — em andamento)
- Matriz V08 composta: as Anotações do CEO entram no MMO como 24 ações novas e 6 condicionais IF/ELSE novas (atendimento por perfil de cliente, formas de pagamento, pós-venda), mais perfis de cliente, classificação de lead (quente/morno/frio), 10 oportunidades e respostas-padrão de atendimento. Os 12 setores, os 22 estágios e as 212 ações da V07 seguem iguais.
- Fichas 5W1H da Fase 1 — Comercial (Est. 01 a 09): 110 fichas, uma por ação, com quem, o quê, por quê, onde, quando e como (as condicionais IF/ELSE vêm descritas no “como”). Sem valores em R$ e sem prazos inventados; onde os documentos não definem algo (ex.: canal de contato antes do contrato), a ficha diz isso.
- Fichas 5W1H da Fase 2 — Técnica/Projeto (Est. 10 a 14): mais 36 fichas (aprovação conjunta do projeto por oito perspectivas, compra de material, despacho e translado).
- Fichas 5W1H da Fase 3 — Execução (Est. 15 a 19): mais 62 fichas (entrega e conferência do material, agendamento, instalação, vistorias interna e da Cemig, treinamento). Onde os documentos não trazem um dado (ex.: duração esperada da instalação), a ficha pede que a Lux o informe.
- Fichas 5W1H da Fase 4 — Homologação e Encerramento (Est. 20 a 22): mais 28 fichas (pedido de ligação, homologação pela Cemig, CAT, feedback, encerramento e oportunidades de pós-venda). Com isso o FPE tem as 236 fichas, uma para cada ação da Matriz V08.
- Bibliotecas do contrato (documentos, ferramentas, investimentos e KPIs): 28 documentos (com a origem de cada um), 7 ferramentas (o CRM próprio consta como futuro e fora do escopo), 6 categorias de investimento **sem valores em R$** e 36 indicadores de produtividade e eficiência para os 12 setores, com formulário de monitoramento e **sem metas** (a Lux define).
- Interface base da ferramenta: barra de navegação com a marca, abertura de tela compacta, botões, cartões de setor, itens expansíveis, etiquetas IF/ELSE e WhatsApp, campos de formulário e rodapé com a nota de propriedade intelectual. Navegação completa por teclado (com “Pular para o conteúdo”), foco visível, contraste conferido e uso de leitor de tela considerado.
- Tela MMO v02: o mapa da operação em painel — 4 fases com os 22 estágios que se abrem para mostrar o que cada setor faz (com as decisões IF/ELSE e o Grupo de Fluxo), os 12 setores com funções, estágios de atuação e equipes, as 21 decisões IF/ELSE e a jornada do cliente em 10 fases. Traz as Anotações do CEO: triagem por perfil de cliente, classificação do lead, Energia por Assinatura e oportunidades de pós-venda. Os números do topo (setores, estágios, ações, decisões, equipes, regiões) são calculados da Matriz.
- Tela FPE: as 236 fichas 5W1H pré-preenchidas, navegação por setor, estágio e ficha, edição livre guardada no navegador (recarregar mantém; “Restaurar padrão” por ficha; aviso se o navegador não guardar) e geração do fluxograma do setor ou geral por fase, já com as suas edições.
- Exportações do FPE: fichas em Markdown e PDF (um setor ou todos), fluxograma em `.mermaid` e PDF (A3 paisagem, fundo branco) por setor ou por fase, e as suas edições em `.json`, que também podem ser importadas de volta (só depois de você confirmar; as edições anteriores ficam guardadas). Arquivos `fpe_<setor|geral>_<data>`. No fluxograma, os textos verde/vermelho das decisões e o nome do setor ficaram legíveis (contraste AA) nos temas escuro e claro.
- No ar: a ferramenta (MMO v02 e FPE) foi publicada na hospedagem de homologação, atrás de senha (sem senha, o acesso é recusado). Cada envio confere o tamanho de todos os arquivos e não altera a proteção de senha do site.

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
