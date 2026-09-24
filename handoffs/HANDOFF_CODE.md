# HANDOFF_CODE — Lux Ferramentas Operacionais

Você é o Claude CODE iniciando o ESTÁGIO PRÁTICO deste projeto. Leia com atenção antes de agir.

## Contexto em 3 linhas
Ferramenta web (React + TS + Vite, hospedada no HostGator atrás de senha) que entrega à Lux Eco Solutions (energia solar, Lavras e Passos/MG) o **MMO v02, o FPE e os POPs** do contrato de consultoria, todos derivados de uma fonte única de dados (`data/matriz_v08.json`).
Persona: o contratante (CEO Luan e equipe) completa, valida e exporta; o consultor (Max) não tem mais acesso a ele.
Fatia vertical do MVP: `matriz_v07.json` → `matriz_v08.json` → fichas 5W1H → telas MMO v02 e FPE com exports → deploy protegido. POP, LLM, XLSX, backup versionado no servidor (máx. 10) com tela `#/versoes`, e a migração para a hospedagem do contratante são a Etapa 03. _(Drive/OAuth descartado em 24/09/2026; construção e homologação na hospedagem particular de Max.)_

## ⚡ REGIME DE AUTONOMIA — instrução prioritária de Max (ele tem pressa)
1. **Único ponto de aprovação humana:** o Plano de Ação (subetapa 01.2). Assim que Max escrever “aprovado”, registre `APROVADO EM: <data>` em `docs/PLANO_DE_ACAO.md` e passe ao modo **autônomo**.
2. **Depois disso, trabalhe da forma mais autônoma possível até o fim da Etapa 03.** Cada subetapa se valida pela Evidência (comando + saída). Verde → commit + push → próxima subetapa, **sem esperar resposta**.
3. **Você só pergunta a Max nestes casos** (e sempre em **uma única mensagem consolidada**, nunca uma pergunta por vez):
   1. credencial `[OBRIGATÓRIA v01]` ausente ou inválida;
   2. ação destrutiva ou irreversível;
   3. qualquer custo acima de R$ 0;
   4. ação manual que só Max pode fazer (cPanel, chave, acessos da hospedagem do contratante na migração);
   5. `/goal` esgotado sem 100% verde (relatório curto de diagnóstico);
   6. decisão que altere o escopo contratual ou o que a Lux afirma sobre si mesma.
4. **Todo o resto: decida, registre e siga.** Decisão técnica → `handoffs/instrucoes.md`. Decisão de conteúdo → `docs/06_CONTEUDO_E_RECONCILIACAO.md`. Nunca peça permissão de rotina.

## Leitura estratégica obrigatória (nesta ordem)
1. `CLAUDE.md` — regras permanentes e convenções.
2. `docs/00_PLANO_E_CRITERIOS.md` — seu roteiro, com portões e provas.
3. `handoffs/instrucoes.md` — biblioteca de dicas técnicas (ver tarefa de abertura).
4. `docs/01_ARQUITETURA.md` e `docs/02_MODELO_DE_DADOS.md`.
5. `docs/06_CONTEUDO_E_RECONCILIACAO.md` — **hierarquia de fontes, divergências, integração das Anotações e regras de preenchimento** (leitura obrigatória antes de qualquer conteúdo).
6. `docs/04_DESIGN_E_MARCA.md` e `docs/05_COMPLIANCE_E_ETICA.md`.
7. Fontes em `data/fontes/` e, **só localmente**, `referencias_privadas/contrato.md` (contém RG/CPF: nunca citar, copiar ou commitar).

## TAREFA DE ABERTURA (antes da Subetapa 01.1) — varrer os repositórios de referência
O arquivo `handoffs/instrucoes.md` (seção 1) lista os repositórios de consulta. Antes da Etapa 01:
1. Consulte cada repositório aplicável (CRM-Sindcom é o prioritário: deploy FTP no HostGator, `.htaccess`, portões).
2. Extraia só o que serve a **este** projeto; preencha as seções 4 e 6 no formato Gatilho → Ação → Evidência → Fonte, citando o repositório.
3. Repositório sem utilidade → uma linha em “Status da varredura”.
4. Commit `docs: varrer repositórios de referência e preencher instrucoes.md` **antes de tocar em código**.

Teto de esforço: 30 minutos. Se estourar, registre o que já achou e siga.

## REGRA PERMANENTE — manter o instrucoes.md vivo
Todo problema não trivial resolvido vira entrada nova na **seção 5**, no mesmo commit da correção. Nunca apague entrada antiga — se obsoleta, `[OBSOLETA — motivo]`.

## Credenciais
O `.env` já existe na raiz. Max preenche as variáveis `[OBRIGATÓRIA v01]`. As `[FUTURA — Etapa 03]` podem estar como placeholder: **não pare por causa delas**; na 01.1 apenas as liste no checklist de Max. As variáveis `GOOGLE_*` e `VITE_GOOGLE_*` são `[OBSOLETA]`: ignore-as. Novas: `BACKUP_LIMITE_MAX` (10) e `BACKUP_DIR_SERVIDOR`. Nunca commite o `.env`; nunca imprima seu conteúdo.

## Como trabalhar
- Comece pela ETAPA 01 em [Plan Mode] até a 01.2; depois [Auto] + [Goal].
- Ao iniciar/terminar cada subetapa, informe modo + função + LLM.
- **Prova executada** antes de dar como concluído.
- Respeite os **portões de fase** (01→02, 02→03, 03→entrega). Portão vermelho bloqueia a etapa seguinte.
- Commit com prefixo padronizado + push ao fim de cada subetapa.
- **Search-first:** antes de codificar contra Mermaid, SheetJS, `docx`, GIS/Drive, OpenRouter, `basic-ftp`, Playwright, confirme a documentação atual.
- **Nunca invente informação sobre a Lux**; sem valores em R$ e sem prazos/SLAs que não estejam nos documentos.
- Ler a planilha **parando na linha “LEGENDA DE CORES”** (contagem correta: 212 células, 31 IF/ELSE).

## Circuit breaker financeiro
Teto: **R$ 0/mês**. Nenhuma compra de crédito, plano pago, proxy ou servidor sem aprovação explícita de Max.

## Decisões pendentes a resolver na Etapa 01 (execução)
- Legibilidade do Mermaid (spike 01.5) · agrupamento das 31 células IF/ELSE em 15 situações (01.4) · modelo `:free` vigente do OpenRouter (03.3) · PHP/`ZipArchive`/usuário autenticado na hospedagem (spike da 03.5).

## Pendências vigiadas (herdadas do estágio criativo)
Ver `docs/00_PLANO_E_CRITERIOS.md` → “Pendências vigiadas”. Principais: chave OpenRouter no bundle; modelos `:free` rotativos; API PHP de backups (dependências do servidor); backups no mesmo servidor; Etapa 04 do contrato sem validação; revisão jurídica de “boleto”/IBS.

## Primeiro passo concreto
Varrer os repositórios e preencher o `instrucoes.md` (01.0); em seguida, rodar `node scripts/checar_env.mjs` e emitir a **lista única** de ações manuais de Max (01.1).
