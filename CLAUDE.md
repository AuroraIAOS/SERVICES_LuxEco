# CLAUDE.md — Lux Ferramentas Operacionais

Regras permanentes. Leia em toda sessão, antes de agir.

## 0. REGIME DE AUTONOMIA (diretriz explícita de Max — prazo apertado)
Após Max aprovar o **Plano de Ação** (subetapa 01.2), trabalhe da forma **mais autônoma possível**.
- **Pergunte a Max SOMENTE nestes casos** (e junte todas as dúvidas numa única mensagem, nunca uma por vez):
  1. Credencial `[OBRIGATÓRIA v01]` ausente ou inválida.
  2. Ação destrutiva/irreversível (apagar dados, reescrever histórico git, sobrescrever produção sem backup).
  3. Qualquer custo > R$ 0 (circuit breaker).
  4. Ação **manual** que só Max pode fazer (cPanel, criar chave, acessos da hospedagem do contratante na migração) — liste todas juntas, uma única vez.
  5. `/goal` esgotado sem 100% verde (relatório curto de diagnóstico).
  6. Decisão que altere escopo contratual ou o que a Lux afirma sobre si mesma.
- **Todo o resto: decida, registre e siga.** Decisão técnica → `handoffs/instrucoes.md`. Decisão de conteúdo → `docs/06_CONTEUDO_E_RECONCILIACAO.md`. Nunca pare para pedir permissão de rotina (nome de arquivo, biblioteca equivalente, ordem interna de subetapa).

## 1. Idioma
Português/BR (salvo termos técnicos).

## 2. Convenções de nomes
snake_case em português para chaves de JSON, campos, funções de dados, scripts e arquivos de dados. Componentes React em PascalCase; código em TS estrito.

## 3. Commits
Prefixo `feat:`/`fix:`/`docs:`/`chore:`/`refactor:`/`test:` + descrição curta em PT-BR. **Um commit por subetapa concluída + push.**

## 4. Segredos
Nunca commitar credenciais/keys/senhas. Revisar `.gitignore` sempre. `.env` é arquivo real e gitignorado: nunca commitar, nunca imprimir em log ou resposta. `VITE_*` vai para o bundle público — só o que pode ser público. FTP e SMOKE nunca levam `VITE_`.

## 5. Segurança (adaptação ao projeto — não há banco)
Ver checklist em `docs/05_COMPLIANCE_E_ETICA.md`: proteção por senha do diretório no cPanel, varredura de segredos (`gitleaks`), repo privado, contrato fora do Git, aviso + consentimento antes de enviar conteúdo ao LLM.

## 6. Avisos de etapa
Ao iniciar e ao terminar cada etapa/subetapa, informe **modo + função + LLM**, conforme o plano.

## 7. Ponte entre estágios
Repo + HANDOFF + `handoffs/instrucoes.md`. Sessões separadas por etapa.

## 8. CHANGELOG
Toda subetapa que muda algo para o usuário final registra uma linha em `CHANGELOG.md` (`+0.1` ou `+1.0`).

## 9. `handoffs/instrucoes.md`
Lido na abertura de toda sessão. Toda solução não trivial vira entrada nova (Gatilho → Ação → Evidência → Fonte) **no mesmo commit da correção**. Nunca apagar entrada; marcar `[OBSOLETA — motivo]`.

## 10. search-first
Antes de escrever código contra API/biblioteca externa (Mermaid, SheetJS, docx, PHP/`ZipArchive`, OpenRouter, basic-ftp, Playwright), confirmar a documentação atual. Não codificar de memória.

## 11. Pendências vigiadas
Ver a seção **Pendências vigiadas** de `docs/00_PLANO_E_CRITERIOS.md`. Relembre-as ao abrir sessões futuras e ao encerrar cada etapa.

---

## Regras específicas do projeto
- **Nunca inventar informações sobre a Lux.** Conteúdo sem fonte nos documentos entra como *sugestão* (campo `origem: "sugerido"` no JSON), nunca como fato. **Nenhum valor em R$** que não esteja nos documentos: investimentos entram como categorias, sem cifra.
- **Fonte única de dados:** `data/matriz_v08.json`. Nenhuma tela guarda número, lista ou texto de negócio fixo no código (`grep` de prova no plano).
- **Ao ler a planilha:** parar na linha "LEGENDA DE CORES" (as linhas de legenda são texto, não ações).
- **Sem selo visível de proveniência** nas telas e nos exports (decisão de Max). O campo `origem` existe no JSON para rastreabilidade interna.
- **Escopo:** IA comercial, CRM, n8n, Supabase e WhatsApp estão fora deste projeto. Não misturar.
- **Roteamento:** `HashRouter` (`#/mmo`, `#/fpe`, `#/pop`, `#/versoes`) — dispensa regra de rewrite no HostGator.
- **Backup:** sem Google/Drive/OAuth (descartado). Backups HTML versionados no servidor via API PHP mínima (`public/api/backups.php`), **máx. 10**, geridos em `#/versoes`. Nunca apagar backup em silêncio; 11º é recusado (409).
- **Ambientes:** construir e homologar na hospedagem particular de Max; **migrar para a do contratante só após “aprovado” de Max** (subetapa 03.8). Código igual; muda só o `.env`.
- **Marca:** usar exclusivamente os tokens de `design/tokens.json` e as fontes de `design/fontes/`.
- **Diretrizes do CEO no POP** (“boleto” no lugar de “financiamento”; credenciamento IBS): reproduzir fielmente no corpo e listar na seção final “Observações para revisão jurídica”. Não editar o sentido, não remover.

## Pendências vigiadas (espelho do plano — manter sincronizado)
- Chave OpenRouter dentro do bundle público (risco: esgotar a cota de 50 req/dia). Gatilho: HTTP 429 recorrente ou 402.
- Modelos `:free` rotacionam sem aviso. Gatilho: HTTP 404/modelo indisponível → revalidar modelo (search-first).
- ~~Tela de consentimento OAuth em modo “teste”~~ — [OBSOLETA — Drive/OAuth descartado em 24/09/2026].
- API PHP de backups depende de PHP ≥ 8, `ZipArchive` e usuário autenticado exposto pelo cPanel. Gatilho: spike da 03.5 e da 03.8.
- Backups no mesmo servidor do site (sem cópia externa) e homologação com dados da Lux na hospedagem de Max (sigilo). Gatilho: migração/descomissionamento (03.8).
- Etapa 04 do contrato (validação com a Lux) não ocorreu: conteúdo sai sem validação formal.
- Revisão jurídica das diretrizes “boleto”/IBS pendente com a Lux.
