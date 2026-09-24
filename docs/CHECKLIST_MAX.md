# CHECKLIST_MAX — ações que só você (Max) pode fazer

_Gerado na subetapa 01.1 a partir de `node scripts/checar_env.mjs` (24/09/2026). Nunca cole senhas em conversa: preencha direto no `.env` local._

## Agora (destrava a Etapa 02 — necessário só na 02.11, mas faça junto)
- [ ] **1. Proteger o diretório com senha (cPanel).** _Achado de 24/09/2026: o docroot do subdomínio é `/home2/maxwe196/lux.strategicepiphany.com` (vazio, `Privada: Não`); a ferramenta irá na subpasta `intelligence/` (a URL de `APP_URL`). Proteja o **docroot do subdomínio** (herda para `intelligence/` e o `.htaccess` do deploy não encosta na proteção)._ cPanel → *Privacidade de diretórios* → `lux.strategicepiphany.com` → **Editar** → marcar “A senha protege este diretório”, dar um nome (ex.: “Lux Intelligence”) → **Salvar** → na seção de usuários, criar usuário e senha. Depois preencher no `.env`: `SMOKE_BASIC_USER` e `SMOKE_BASIC_PASS` (**os mesmos** criados aqui). Sem prefixo `VITE_`. É com essa conta que eu provo `401` sem senha / `200` com senha.
- [ ] **2. Ajustar `APP_AMBIENTE=homologacao`** no `.env` (o script avisou que o valor atual não é um dos aceitos: `homologacao`, `producao`, `desenvolvimento`).

## Antes da Etapa 03 (não bloqueia agora)
- [x] **3. PHP ≥ 8.0 no subdomínio — verificado pelo CODE em 24/09/2026:** `lux.strategicepiphany.com` usa **PHP 8.3** (`ea-php83`, herdado). Nada a fazer.
- [x] **4. Chave OpenRouter com limite de gasto US$ 0 — confirmado por Max em 24/09/2026.** O modelo `:free` vigente (`VITE_OPENROUTER_MODELO_PADRAO`) eu valido sozinho na 03.3.

## Só na migração (subetapa 03.8 — depois do seu “aprovado”)
- [ ] **5.** Acessos da hospedagem do contratante: subdomínio + https, conta FTP, proteção de diretório, PHP ≥ 8, e o **host real do servidor** (aquele da URL do cPanel na porta 2083 — não o `ftp.<dominio>` se o site estiver atrás de Cloudflare).

## Já resolvido
- [x] Repositório GitHub **privado** (`AuroraIAOS/SERVICES_LuxEco`).
- [x] `.env` fora do Git (`git ls-files | grep -c "^\.env$"` → `0`) e sem variáveis do Google.
- [x] Credenciais de FTP, domínio, LLM e backup preenchidas (15 de 17 obrigatórias; faltam só as `SMOKE_*` do item 1).

## Como conferir depois
`node scripts/checar_env.mjs` → deve terminar com `OBRIGATÓRIAS v01: 17/17 preenchidas`.
