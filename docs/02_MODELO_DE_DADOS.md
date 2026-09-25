# 02 — MODELO DE DADOS

Não há banco. A fonte é JSON versionado (`data/`). Sem RLS. Chaves em `snake_case` PT-BR. Números de tela são **calculados** desses dados.

## Arquivos
| Arquivo | Gerado por | Conteúdo |
|---|---|---|
| `data/matriz_v07.json` | `npm run dados:gerar` (xlsx → json) | Espelho fiel da Matriz V07. |
| `data/conteudo/anotacoes_v08.json` | escrito à mão pelo CODE (spec: doc 06 §3) | Overlay das Anotações do CEO. |
| `data/matriz_v08.json` | `npm run dados:compor` (v07 + overlay) | **Fonte de verdade das telas.** |
| `data/conteudo/fichas_autoria.json` | escrito à mão pelo CODE (subetapas 02.2–02.5; spec: doc 06 §4) | Autoria das fichas: `why`/`how` de cada ação (ou modelo p/ texto repetido) + catálogos de setor, estágio e local. |
| `data/conteudo/fichas_5w1h.json` | `npm run dados:fichas` (autoria + V08) | 1 ficha por célula (ação). Nunca editar à mão. |
| `data/conteudo/documentos.json`, `ferramentas.json`, `investimentos.json`, `kpis.json` | CODE (02.6) | Bibliotecas. |
| `data/conteudo/mapa_condicionais.json` | CODE (01.4) | Agrupamento das 31 células IF/ELSE nas 15 situações do Mapa (vínculo direto, participantes sugeridos, sem situação, divergência de estágio). |
| `data/conteudo/perguntas_pop.json`, `pop_templates.json`, `pop_observacoes_juridicas.json` | CODE (03.1) | Tela e templates do POP. |
| `BACKUP_DIR_SERVIDOR/bk_*.html` + `bk_*_meta.json` | API PHP (03.5) — **fora do Git, só no servidor** | Backups versionados (máx. 10). O JSON de estado vive dentro do `.html`. |

## Entidades (campos principais)
```
setor            { id: "setor_01".."setor_12", numero, nome, cor_token (chave em design/tokens.json → `setores.<slug>`; a cor vive só nos tokens), tipo?: "estrategico"|"interno"|"externo" (V08), equipes?: [{nome, regiao, empresa?}] (V08) }
fase             { id: 1..4, nome }                        // Comercial, Técnica/Projeto, Execução, Homologação e Encerramento
estagio          { id: 1..22, numero, nome, fase_id, descricao? }
acao             { id: "acao_<setor>_<estagio>_<ordem>", setor_id, estagio_id, ordem, texto, e_condicional: bool, canal?: "whatsapp_grupo_fluxo", celula (ref. na planilha, ex. "P6"), origem_doc?: string }
condicional      { id, acao_id, pergunta: string (= texto-base da ação), se_sim: {rotulo, texto}, se_nao: {rotulo, texto}, situacao_id? (preenchido pelo mapa/V08) }   // 1º ramo da célula = se_sim, 2º = se_nao; o texto original se reconstrói exatamente
situacao         { id, nome, estagio_id, setor_id }        // as "15 situações" (agrupa células IF/ELSE)
ficha_5w1h       { id: "ficha_<setor>_<estagio>_<ordem>" (= sufixo do id da ação), acao_id, setor_id, estagio_id, what, why, where, when, who, how, origem: "documentado"|"sugerido"|"manual", fontes: [{arquivo, trecho}], atualizado_em }   // fichas_5w1h.json = { meta{versao_matriz, gerado_de, fases_autoradas, total}, fichas[] }
documento        { id: "doc_NN", nome, estagio_ids[], setor_ids[], origem, fontes?: [{arquivo, trecho}] (obrigatório se documentado), justificativa? (obrigatória se sugerido) }
ferramenta       { id: "fer_NN", nome, setor_ids[], estagio_ids[], origem, situacao: "em_uso"|"temporaria"|"futura", observacao?, fontes?, justificativa? }   // CRM próprio = futura (fora do escopo)
investimento     { id: "inv_NN", categoria, setor_ids[], descricao, valor_estimado_brl: null, origem, fontes?, justificativa? }   // sempre null no v01
kpi              { id: "kpi_<setor>_<n>", setor_id, tipo: "produtividade"|"eficiencia", nome (≤ 60 car.), formula_descricao (1 linha, ≤ 160 car.), meta: null, formulario: ["indicador","periodo","meta","realizado","responsavel","observacoes"], acompanhamento?: true (Cemig e Cliente), origem, fundamento (ação da Matriz que o sustenta) }   // kpis.json.meta.campos_formulario descreve cada campo
oportunidade     { id, nome, prioridade_padrao: "alta"|"media"|"baixa", estagio_id }   // Anotações §1.4
perfil_cliente   { id, nome, criterios, proxima_acao }                                  // Anotações §1.1
classificacao_lead { id: "lead_quente"|"lead_morno"|"lead_frio", nome, criterios: string[] }   // Anotações §1.1.1.7
resposta_padrao  { id, tema, texto, revisao_juridica: bool }                                   // Anotações §2 (texto fiel; true = vai à seção 11 do POP)
// matriz_v08.json = { meta{…, base_v07, overlay, origem_doc}, fases, setores, estagios, acoes, condicionais (com situacao_id), perfis_cliente, classificacao_lead, oportunidades, respostas_padrao }
pop_secao        { id, ordem, titulo, campos[] }
pop_gerado       { id, escopo: "setor"|"geral", setor_id?, texto_por_secao{}, gerado_com: "template"|"llm", criado_em }
versao_backup    { id: "bk_AAAAMMDD_HHMMSS_<8hex>", rotulo, escopo: "fpe"|"pop"|"completo", criado_em, tamanho_bytes, sha256, versao_app, protegido: bool }   // metadados no servidor (sem Drive)
config_llm       { schema_versao, teto_mensal_brl: number>=0 (padrão do .env, hoje 0), alerta_percentual: 1..100, limite_diario_requisicoes: int>=0, modelos: string[1..3] (principal + reservas, ids `:free` do OpenRouter), preco_entrada_brl_por_milhao?: number, preco_saida_brl_por_milhao?: number, atualizado_em }   // salvo no servidor (configuracao_llm.json) + cópia local; SEM chave de API
uso_llm          { mes: "AAAA-MM", dia: "AAAA-MM-DD", tokens_entrada, tokens_saida, gasto_estimado_brl, requisicoes_dia }   // contador local
estado_backup    { schema_versao, fpe_edicoes: {ficha_id: {campo: valor}}, pop_respostas: {}, gerado_em }   // embutido no .html de backup; sem PII
```

## Regras de integridade (viram testes em `scripts/validar_dados.ts`)
1. 12 setores e 22 estágios; ids únicos.
2. V07: `células == 212` e `células_if_else == 31` (se a planilha mudar, o teste acusa).
3. V08: `células_v08 > 212`; toda `acao` nova tem `origem_doc`.
4. **Uma ficha por célula:** `count(fichas) == count(acoes)`; nenhuma ficha órfã.
5. Nenhum campo 5W1H vazio; `who` sem nome de pessoa interna.
6. `investimento.valor_estimado_brl === null` para todos; `kpi.meta === null` para todos.
7. Cada setor tem ≥1 KPI de produtividade e ≥1 de eficiência.
8. Presença setor × estágio de V07 == planilha == MMO_v01 legado (`scripts/comparar_mmo_legado.ts`).
10. **Config do LLM:** `modelos` com 1 a 3 ids sem repetição; `teto_mensal_brl >= 0` e `<= 10000`; `alerta_percentual` em 1–100; gasto estimado ≥ teto ⇒ nenhuma chamada paga (teste); a config nunca contém chave de API (teste). Padrão inicial vem do `.env`; edição do painel prevalece.
9. **Backups:** `count(versao_backup) <= 10` (servidor recusa o 11º com 409); `id` obedece `^bk_\d{8}_\d{6}_[0-9a-f]{8}$`; todo backup contém `estado_backup` JSON válido com `schema_versao`; item `protegido` nunca é apagado por operação em lote. Testado em `src/backup/backup.test.ts` e `npm run backup:provar`.
