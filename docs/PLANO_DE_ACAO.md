# PLANO DE AÇÃO — Lux Ferramentas Operacionais (24/09/2026)

Decisões travadas **não são reabertas** (ver `docs/00`). Este plano só define a ordem real, os lotes, os riscos e o esforço. Estimativas em **horas de CODE** (faixa honesta, não promessa).

## 1. Ordem real de execução
**Etapa 01 — fundação (≈ 4–6 h).** 01.3 scaffold → 01.4 pipeline xlsx→`matriz_v07.json` **∥** 01.5 spike Mermaid × raias (independentes após 01.3) → 01.6 gitleaks + pré-commit → 01.7 HANDOFF_BUILD. *Portão 01→02 antes de qualquer arquivo em `src/telas/`.*

**Etapa 02 — MVP (≈ 14–20 h).** 02.1 V08 → lotes de fichas 02.2 → 02.3 → 02.4 → 02.5 (com **02.6 bibliotecas ∥** e **02.7 UI base ∥**, pois não dependem das fichas) → 02.8 tela MMO → 02.9 tela FPE → 02.10 exports → 02.11 deploy → 02.12 handoff.
*Ajuste de ordem:* o **spike de PHP** (versão, `ZipArchive`, usuário autenticado, gravação) roda já na **02.11**, junto do 1º deploy — barato e elimina o maior risco da 03.5 cedo.

**Etapa 03 — upgrades (≈ 16–22 h).** Ordem real: 03.1 POP por template → 03.2 `.docx/.pdf` → **03.5 API PHP** → **03.3 LLM + painel de limite** (persiste `config_llm` pela API da 03.5) → 03.4 XLSX → 03.6 tela `#/versoes` → 03.7 build offline + guia → 03.8 migração (só com seu “aprovado”). A numeração do plano não muda; só a ordem.

## 2. Lotes de conteúdo (uma ficha 5W1H por célula da V08)
| Lote | Estágios | Regra |
|---|---|---|
| Fase 1 Comercial | 01–09 | maior volume e mais Anotações do CEO (perfis, Energia por Assinatura) |
| Fase 2 Técnica | 10–14 | |
| Fase 3 Execução | 15–19 | |
| Fase 4 + consolidação | 20–22 | inclui ações novas do Est. 22 |
Em todos: `what` fiel à ação; `why/where/when/how` só com o que os documentos sustentam, o resto `origem: "sugerido"`; **sem R$ e sem prazo/SLA**; `who` = função/setor ou equipe nomeada na Matriz. Cada lote fecha com `dados:validar --fichas --fase=N` (n/n).

## 3. O que roda em paralelo
01.4 ∥ 01.5 · 02.6 ∥ 02.7 ∥ fichas · 03.1 ∥ 03.5 (conteúdo do POP × servidor). Só uso sessões/subagentes paralelos onde os arquivos não se sobrepõem; a validação e o commit continuam sequenciais.

## 4. Riscos e mitigação
| Risco | Mitigação |
|---|---|
| Mermaid ilegível (22 × 12) | Spike 01.5 com limites em px; fallback SVG de raias já desenhado |
| Volume de fichas (> 212) | Lotes por fase, validador n/n, `sugerido` em vez de inventar |
| Deploy apagar a senha do cPanel (`.htaccess`) | Mesclar, nunca sobrescrever; prova `401` após cada deploy |
| FTP: host atrás de CDN / erro 451 | Host real; reenvio sob TLS + verificação de tamanho; nunca dados em claro (sigilo) |
| API PHP nova superfície | Portão adversarial (03.5); id por regex; cabeçalho anti-CSRF; `flock`; 11º = 409 |
| Backups no mesmo servidor do site | Guia orienta baixar `.zip`; pendência vigiada |
| Conteúdo sem validação da Lux (Etapa 04) | Marcado em pendências; nada afirmado sem fonte |
| Custo de LLM | Teto R$ 0 por padrão, aplicado em código; painel exige ciência para subir |
| Dados da Lux no servidor de Max | Senha sempre ativa; descomissionamento só com sua aprovação (03.8) |

## 5. Como me acompanhar
`docs/00_PLANO_E_CRITERIOS.md` → **Tabela de Progresso** (status por subetapa) + um commit por subetapa concluída. Só volto a perguntar nos 6 casos do `CLAUDE.md` §0, numa única mensagem.

## 6. Pendências suas (não bloqueiam a aprovação)
`docs/CHECKLIST_MAX.md`: `SMOKE_BASIC_USER/PASS` (só na 02.11), `APP_AMBIENTE=homologacao`, PHP ≥ 8 no subdomínio, confirmar limite US$ 0 da chave OpenRouter.

## 7. O que a aprovação autoriza
Executar as subetapas 01.3 a 03.7 sem novas confirmações, com teto de gasto **R$ 0**, deploy **somente** na hospedagem particular de Max, e **sem** iniciar a migração (03.8) nem apagar nada no servidor sem novo “aprovado”.

APROVADO EM: 2026-09-24 (Max: "feito. podemos seguir", após o resumo do Plano de Ação e do escopo autorizado na seção 7)
