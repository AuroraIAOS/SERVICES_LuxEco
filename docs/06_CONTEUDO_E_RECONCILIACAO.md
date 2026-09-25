# 06 — CONTEÚDO E RECONCILIAÇÃO

Regras de conteúdo do projeto: qual fonte manda, o que diverge entre as fontes, como integrar as Anotações do CEO e como preencher fichas, bibliotecas e POPs **sem inventar nada sobre a Lux**.

## 1. Hierarquia de fontes (decidida no estágio criativo)
1. **`data/fontes/Matriz_Operacional.xlsx` (Matriz V07)** — fonte de verdade da estrutura (setores × estágios × ações × IF/ELSE).
2. **`data/fontes/Anotacoes_CEO_2026-09-24.md`** — fonte de verdade do raciocínio comercial; **acrescenta** à Matriz (não a contradiz). Vira o overlay V08.
3. `Mapa_Organizacional.md` e `Relatorio_Operacional_V07.md` — **derivados**. Servem para textos (objetivo do estágio, riscos, jornada do cliente). Onde divergem da Matriz, a Matriz vence.
4. `legado/MMO_v01.html` — referência visual e de comportamento. Verificado: sua presença setor × estágio é **idêntica** à Matriz (12 setores, 22 estágios). Não é fonte de dados.

> Atenção ao ler a planilha: a partir da linha “LEGENDA DE CORES” há linhas de legenda (texto), **não ações**. Contagem correta da Matriz V07: **212 células preenchidas**, das quais **31 são células IF/ELSE**. O texto “+210 ações / 15 condicionais” do Mapa é aproximação.

## 2. Divergências Mapa/Relatório × Matriz (registradas; a Matriz vence)

“Atuação principal” do Mapa é um subconjunto declarado. Só é **conflito** quando o Mapa aponta um estágio em que a Matriz **não** tem célula para o setor.

| Setor | Mapa: atuação principal | Matriz: estágios com célula | Estágios do Mapa ausentes na Matriz | Situação |
|---|---|---|---|---|
| Marketing | 01, 02, 04, 22 | 01, 02, 03, 22 | 04 | **CONFLITO** |
| Vendas | 01–22 | 01, 02, 03, 04, 05, 06, 07, 08, 13, 14, 15, 16, 17, 19, 22 | 09, 10, 11, 12, 18, 20, 21 | **CONFLITO** |
| Administrativo | 01–22 | 01–22 | — | ok |
| Financeiro | 03, 09, 13, 14, 15, 18, 22 | 03, 04, 06, 08, 13, 14, 15, 17, 22 | 09, 18 | **CONFLITO** |
| Contabilidade | 04, 07, 13, 14, 18, 22 | 04, 06, 08, 13, 14, 17, 22 | 07, 18 | **CONFLITO** |
| CEO | 01–22 | 01–22 | — | ok |
| Engenharia | 02, 11, 12, 13, 21 | 02, 03, 10, 11, 13, 19, 21 | 12 | **CONFLITO** |
| Fornecedores | 03, 04, 14, 15, 17, 19 | 03, 04, 14, 15, 17, 19 | — | ok |
| Logística | 15 | 14, 15 | — | ok |
| Equipe Técnica | 02, 13, 15, 16, 17, 18, 19, 20 | 02, 03, 13, 15, 16, 17, 18, 19, 20 | — | ok |
| Cemig | 18, 20, 21 | 18, 20, 21 | — | ok |
| Cliente | 02, 05, 07, 09, 13, 15, 17, 18, 19, 22 | 02, 03, 04, 05, 06, 07, 08, 09, 13, 14, 15, 16, 17, 18, 19, 22 | — | ok |

Outros pontos:
- **Marketing / layouts:** Mapa (Est. 04) e Relatório (Est. 04, “refina layouts”) vs Matriz (célula “Cria e edita layouts e cenários de simulação” no **Est. 03**). Vale a Matriz.
- **Vendas “01 a 22”:** a Matriz tem Vendas em 15 dos 22 estágios (ausente em 09–12, 18, 20, 21). O texto “transversal” do Mapa é retórico; vale a Matriz.
- **Est. 13 — “7 perspectivas”:** o Mapa lista 7 (Vendas, Adm, Financeiro, Contabilidade, Engenharia, CEO, Cliente). A Matriz tem **8** setores com célula no Est. 13 (inclui **Equipe Técnica**: “Aprova projeto conforme critérios técnicos”). Vale a Matriz: 8.
- **Condicionais com estágio deslocado** (tabela de 15 situações do Mapa/Relatório vs células IF/ELSE da Matriz):

| # (Mapa) | Situação | Mapa/Relatório | Matriz V07 |
|---|---|---|---|
| 5 | CEO reassina contrato após renegociação | Est. 07 | Est. **06** (CEO) |
| 12 | Inconformidade financeira | Est. 18 | Est. **17** (Financeiro) |
| 13 | Inconformidade fiscal | Est. 18 | Est. **17** (Contabilidade) |
| 14 | Negativa de homologação (CEO) | Est. 21 | Est. **20** (CEO e Administrativo) |

- **31 células IF/ELSE × 15 condicionais:** várias células (setores diferentes) descrevem a mesma situação. **Hipótese a validar por teste** na subetapa 01.4: agrupar as 31 células nas 15 situações e registrar o mapeamento em `data/conteudo/mapa_condicionais.json`. Se o agrupamento não fechar em 15, a ferramenta passa a exibir a contagem real e registra a diferença aqui.
- **`Relatorio_Operacional_V07.md`** era um `.docx` que é, na verdade, markdown puro. Se for entregue à Lux, regerar como Word de verdade.

**Resultado do agrupamento (subetapa 01.4 — `data/conteudo/mapa_condicionais.json`).** As **31 células IF/ELSE** da Matriz fecham nas **15 situações** do Mapa, cada célula em exatamente um lugar: **17** com vínculo direto (mesmo setor e tema da situação), **11** como *participantes* de outros setores ligados à mesma situação por tema (`origem: "sugerido"`, com o motivo registrado) e **3** sem situação no Mapa (Est. 18: Equipe Técnica, Cemig e Cliente “comunicam situações/inconformidades ao Administrativo”). As 4 situações com estágio deslocado (5, 12, 13, 14) estão marcadas `divergencia_estagio: true`; vale a Matriz. Nenhum texto de célula foi alterado. Os vínculos “sugerido” e as 3 células sem situação devem ser validados com a Lux (Etapa 04 do contrato, pendente).

## 3. Integração das Anotações do CEO (overlay V08) — decisão de Max: refazer todo o MMO integrando

Conteúdo **novo** trazido pelas Anotações (não existe na Matriz V07):
1. **Perguntas iniciais obrigatórias** (abertas) no atendimento: “Como o senhor resolve hoje a questão da energia?” + aprofundamentos (paga só distribuidora? tem solar neste ou em outro imóvel que compensa? compra energia por assinatura? outro modelo de geração?).
2. **Triagem por perfil de cliente** (4): paga só distribuidora · já possui solar · compra energia por assinatura · imóvel alugado. Mais o perfil **financeiro**: capital disponível → priorizar à vista; sem capital → priorizar financiamento.
3. **Classificação de lead:** Quente / Morno / Frio (critérios nas Anotações §1.1.1.7).
4. **Produto “Energia por Assinatura da Lux”** — ofertada quando o cliente não quer ou não consegue instalar o sistema.
5. **Análise de contexto obrigatória** (12 informações a coletar) e **decisões comerciais** por cenário; regra “nunca competir só por preço”.
6. **Identificação de oportunidades** (toda conversa gera pelo menos uma), classificadas em alta/média/baixa prioridade.
7. **Resolução de situações não previstas** (5 passos) — princípio de registrar a decisão para padronizar depois.
8. **Portfólio pós-venda:** ampliação, retrofit, manutenção preventiva, monitoramento, limpeza técnica, seguro, atendimento de outras unidades consumidoras, indicações.
9. **Respostas-padrão do atendimento:** garantia, formas de pagamento (financiamento “boleto”, cartão em até 21x por plataforma especializada, à vista, em etapas), qualidade dos equipamentos. **Diretriz para IA e equipe comercial** (5 princípios).

Regras de integração (o CODE decide os detalhes, sem perguntar):
- Os itens 1–3, 5 e 9 entram como **ações e IF/ELSE novos** no **Est. 02 (Atendimento)**, com Vendas como executor e CEO como instância de decisão; itens de pagamento tocam também **Est. 03/05** (Financeiro/Vendas).
- Os itens 6–8 entram no **Est. 22 (Pós-venda)** e como ramificação a partir do Est. 02 (Energia por Assinatura como desfecho alternativo do funil).
- Cada ação/condicional novo carrega `origem_doc: "anotacoes_ceo_2026-09-24"`. Não renomear estágios nem setores; **os 22 estágios e 12 setores permanecem**.
- Números do hero (ações, condicionais, etc.) são **calculados** do JSON V08, nunca digitados.
- Ao fim, a V08 deve ter: `células_v08 > 212` e `condicionais_v08 > condicionais_v07`.

**Resultado da integração (subetapa 02.1 — `data/conteudo/anotacoes_v08.json` → `data/matriz_v08.json`).** A V08 tem **236 células** (212 da V07 + **24 novas**) e **37 IF/ELSE** (31 + **6 novas**); os 12 setores e 22 estágios seguem idênticos e nenhuma célula da V07 foi tocada. Decisões de conteúdo (sem perguntar, conforme o regime de autonomia):
- **Onde entrou cada item** — Est. 02: Vendas executa (pergunta aberta, aprofundamento, perfil, contexto de 12 informações, imóvel alugado sem objeção, solar existente?, assinatura?, quer/consegue instalar? → Energia por Assinatura da Lux, condição financeira → à vista × “boleto”, lead quente/morno/frio, objeções sem competir só por preço, respostas-padrão, oportunidade classificada, próximo passo) e o **CEO decide** (estratégia por cenário; situação não prevista → 5 passos). Est. 03: Vendas apresenta as formas de pagamento e o Financeiro as apoia. Est. 05: Vendas informa que a aprovação depende de análise de crédito (a ressalva “conforme projeto e crédito aprovado” fica na própria célula). Est. 22: Vendas identifica oportunidades de pós-venda, pede indicações e classifica a prioridade (alta → conduz proposta; média/baixa → relacionamento de longo prazo); Administrativo registra; CEO registra decisões para padronização.
- **Sem par novo:** todas as células novas entram em pares setor × estágio que a V07 já tinha; a presença setor × estágio continua igual à do MMO_v01.
- **`situacao_id` (docs/02):** preenchido nas condicionais da V07 a partir do mapa (17 diretas + 11 participantes = 28); as 3 sem situação ficam sem. As 6 condicionais novas **não** ganham situação: as “15 situações” são do Mapa.
- **Oportunidades:** a prioridade **padrão** (alta/média/baixa) de cada uma das 10 oportunidades é inferência do consultor (`origem: "sugerido"`) — as Anotações classificam a prioridade por cenário, não por oportunidade. Validar com a Lux (Etapa 04 do contrato, pendente).
- **Diretrizes do CEO reproduzidas fielmente:** “boleto” no lugar de “financiamento” e a credencial IBS entram como estão nas Anotações (células e `respostas_padrao` com `revisao_juridica: true`); serão listadas na seção final “Observações para revisão jurídica” do POP (03.1). O trecho “proprietário costuma autorizar / protege o telhado” **não** virou célula da Matriz: fica apenas no perfil “Imóvel alugado”, com remissão à revisão jurídica.
- **Sem cifra e sem prazo:** o validador reprova qualquer texto novo com “R$ <número>” ou prazo numérico (dias/horas/…); “até 21 vezes” do cartão é dado das Anotações, não prazo.

## 4. Regras de preenchimento (fichas 5W1H e bibliotecas)

**Ficha 5W1H = uma por célula (setor × estágio ativo).** Campos obrigatórios não vazios: `what`, `why`, `where`, `when`, `who`, `how`.
- **what:** a ação da célula (texto da Matriz), sem reescrever o sentido.
- **why:** objetivo do estágio (Mapa/Relatório) e/ou princípio das Anotações. Se só existe inferência: `origem: "sugerido"`.
- **where:** local/canal **documentado** (WhatsApp/Grupo de Fluxo a partir do Est. 07; imóvel do cliente; Cemig; escritório). Sem inventar endereço ou sistema.
- **when:** estágio + gatilho da célula (ex.: “após a assinatura do contrato”). **Sem prazos numéricos (SLA) que não estejam nos documentos.**
- **who:** **somente função/setor**, mais as equipes/engenharias **já nomeadas na Matriz** (Lavras: Illumini/Tiago e Vinícius · Passos: Lumines/Odirley e C7/João Paulo · Engenharia: Galva e Telar). Sem nomes de pessoas internas.
- **how:** o passo a passo da célula + condicionais (IF/ELSE) + ferramentas documentadas.
- Campo interno `origem`: `"documentado"` (todo o conteúdo rastreável a fonte) | `"sugerido"` (tem inferência do consultor) | `"manual"` (editado pelo contratante na ferramenta). Lista `fontes` com arquivo + trecho. **Não exibir selo** nas telas e exports (decisão de Max); o dado fica no JSON.

**Bibliotecas (6.c–6.h):**
- **Documentos (6.d)** — documentados: conta de energia do cliente, simulação de consumo, proposta comercial, contrato (digital), ordem de compra (OC), guias de translado, projeto técnico, CAT, laudo de vistoria, comprovante de treinamento, pedido de ligação/homologação, parecer de inviabilidade, parecer da Cemig com ajustes.
- **Ferramentas (6.e)** — documentadas: WhatsApp (Grupo de Fluxo, temporário), Google Ads, plataformas financeiras parceiras (crédito), plataforma especializada de cartão (até 21x). O CRM próprio é **futuro e fora de escopo**.
- **Investimentos (6.f)** — **categorias sem valor** (ex.: ferramentas de gestão, treinamento, equipamentos de medição). **Proibido inventar cifra em R$.** Campo `valor_estimado_brl` fica `null`.
- **KPIs (6.g produtividade e 6.h eficiência)** — biblioteca de KPIs-padrão **por setor** (mínimo 1 de produtividade e 1 de eficiência por setor, inclusive Cemig e Cliente como “indicadores de acompanhamento”), cada um com **formulário de monitoramento** (campos: indicador, período, meta [vazia], realizado, responsável [função], observações). **Metas ficam vazias** para a Lux preencher.

## 5. POP — estrutura fixa (template nosso; o LLM só redige campos)
Seções, nesta ordem: 1 Objetivo · 2 Abrangência (setor e estágios) · 3 Responsáveis (funções) · 4 Definições · 5 Pré-requisitos e documentos · 6 Procedimento (por estágio: 5W1H resumido, passos) · 7 Condicionais e escalonamento · 8 Ferramentas e recursos · 9 Métricas e formulários de monitoramento · 10 Registros e melhoria contínua · **11 Observações para revisão jurídica** (discreta, sempre por último).

**Seção 11 — itens obrigatórios (diretrizes do CEO reproduzidas fielmente no corpo do POP e listadas aqui):**
1. Orientação de usar o termo “boleto” no lugar de “financiamento” na comunicação comercial. *Revisar: em operações de crédito com consumidor, a informação sobre juros e custo total deve ser clara.*
2. Afirmação de que a parcela fica próxima ou inferior à conta de energia. *Revisar: condicionar a projeto/aprovação de crédito, como já ressalvado nas Anotações; evitar promessa genérica.*
3. Afirmação de que a Lux é credenciada junto ao IBS (Instituto Brasileiro de Energia Solar). *Revisar: não há documento de suporte no material do projeto; confirmar antes de usar como argumento de venda.*
4. Afirmações técnicas de venda (proprietário costuma autorizar instalação; instalação protege o telhado). *Revisar tecnicamente antes de uso como padrão.*
(Este texto é sinalização ao contratante, não parecer jurídico.)

**Perguntas estratégicas por setor (tela POP):** ≥ 8 por setor, derivadas dos campos 5W1H, condicionais, KPIs e riscos documentados (ex.: para Cemig, o principal risco de prazo). Cada pergunta vem com **resposta-padrão pré-preenchida** e editável.
