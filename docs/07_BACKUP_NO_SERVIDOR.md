# 07 — BACKUP VERSIONADO NO SERVIDOR

Decisão de 24/09/2026 (Max): sem Google Drive/OAuth. Backups HTML ficam no servidor da hospedagem, **máximo de 10**, geridos na tela `#/versoes`. Implementação nas subetapas 03.5 (API — **feita**, 25/09/2026) e 03.6 (tela) de `docs/00_PLANO_E_CRITERIOS.md`.

## Contrato da API (`public/api/backups.php`)
Tudo atrás da senha de diretório do cPanel: sem usuário autenticado **pelo servidor web** → 401 (`REMOTE_USER`/`REDIRECT_REMOTE_USER`; o cabeçalho `Authorization` que o cliente manda **não** conta, só o Apache confirma a senha). Mutações são `POST` com `Content-Type: application/json` e o cabeçalho `X-Lux-Requisicao: 1`. Toda resposta é JSON, exceto download/ver. Erro: `{"erro": "<codigo>", "mensagem": "<PT-BR simples>"}`.

| Ação | Método | Entrada | Saída |
|---|---|---|---|
| `listar` | GET | — | `200 {limite, total, itens:[{id, rotulo, escopo, criado_em, tamanho_bytes, sha256, versao_app, protegido}]}` (mais nova primeiro) |
| `criar` | POST | JSON `{html, rotulo?, escopo?: fpe\|pop\|completo, versao_app?}` | `201 {id, item, limite, total}`; `409 limite_atingido {limite, total}`; `413` (HTML > 5 MB ou corpo > 8 MB); `422 backup_invalido` (sem bloco `lux-estado` válido, ou com chave/senha) |
| `baixar` | GET | `id` | `.html` como anexo (`Content-Security-Policy: sandbox`); `400` id inválido; `404` |
| `baixar_zip` | POST | `{ids:[…]}` (1 a 50) | `.zip` (nomes `bk_*.html`); `404` se algum id não existe; `501` sem `ZipArchive` |
| `excluir` | POST | `{ids:[…]}` | `200 {excluidos, ignorados_protegidos, inexistentes}` (protegido nunca sai) |
| `renomear` | POST | `{id, rotulo}` (≤ 80 caracteres, sempre texto) | `200 {item}` |
| `proteger` | POST | `{id, valor: true\|false}` | `200 {item}` |
| `config_ler` | GET | — | `200 {existe: bool, config: config_llm\|null}` (`existe: false` = usar o padrão do build) |
| `config_gravar` | POST | `config_llm` (JSON) | `200 {config}`; `422 config_invalida` se sair das faixas, tiver campo extra ou **qualquer chave de API** |
| `ver` | GET | `id` | `.html` inline com `Content-Security-Policy: sandbox; default-src 'none'; …` (sem scripts nem rede) |

`id`: `^bk_\d{8}_\d{6}_[0-9a-f]{8}\z` (**`\z`, não `$`**: o `$` do PCRE aceita um `\n` no fim), gerado no servidor; o nome de arquivo nunca vem do cliente.
`config_llm`: `schema_versao 1`, `teto_mensal_brl` 0–10.000, `alerta_percentual` inteiro 1–100, `limite_diario_requisicoes` inteiro 0–100.000, `modelos` 1–3 ids `:free` sem repetição, preços opcionais 0–10.000, `atualizado_em`. Nada mais.

## Armazenamento e configuração
- Pasta `BACKUP_DIR_SERVIDOR` **fora da raiz web** (na hospedagem de Max: `/home2/maxwe196/lux_backups`; o `.env` traz `../lux_backups`, resolvido a partir de `CPANEL_DIRETORIO`). O deploy **recusa** uma pasta dentro do docroot. Cada backup = `bk_<AAAAMMDD_HHMMSS>_<8hex>.html` + `bk_..._meta.json` (`rotulo`, `escopo`, `criado_em`, `tamanho_bytes`, `sha256`, `versao_app`, `protegido`); a config do LLM fica em `configuracao_llm.json` na mesma pasta.
- `api/config.php` é **gerado pelo deploy** a partir do `.env` (`BACKUP_DIR_SERVIDOR` absoluto, `BACKUP_LIMITE_MAX` de 1 a 10, `FUSO_HORARIO`): nunca está no Git nem no `dist/`; `api/.htaccess` nega leitura direta (403) e desliga cache/listagem. O teto de 10 é rígido também no PHP.
- Escrita atômica (`.tmp` + `rename`) e `flock` na pasta durante criar/excluir/alterar: duas criações simultâneas não furam o limite.
- O PHP nunca executa nem reescreve o conteúdo do backup; o HTML é guardado byte a byte e entregue sob `sandbox`.

## Anatomia do backup `.html`
1. Renderização estática do FPE e/ou POP (tokens de marca embutidos, imprimível, sem JS obrigatório).
2. `<script type="application/json" id="lux-estado">` (atributos exatamente nesta ordem) com `estado_backup { schema_versao: 1, fpe_edicoes, pop_respostas, gerado_em }`. O gerador (03.6) escapa `<` como `<` dentro do JSON.
3. Cabeçalho com data, rótulo, versão do app e a nota de propriedade intelectual de `docs/05`.

## Regras de operação
- 11º backup: 409; a interface oferece “excluir o mais antigo não protegido e salvar” (ação explícita, com confirmação).
- Exclusão em lote sempre pede confirmação e poupa itens protegidos.
- Restaurar substitui o estado local; antes, o app guarda um ponto de desfazer em `localStorage`.
- Sem servidor de backup (offline/`localhost`/arquivo aberto do disco): “Salvar versão” desativado; “Baixar arquivo” continua. `src/backup/servidor.ts` trata qualquer falha como “sem servidor”.
- Cópia fora do servidor é responsabilidade do contratante (baixar `.zip`); o guia explica.

## Como testar
- **Local, sem servidor:** `npm run php:preparar` (baixa um PHP 8.3 portátil para `tools_locais/`, confere o SHA-256 do php.net; ou use um `php` ≥ 8.1 com zip e mbstring do PATH) e `npm test -- adversarial_api` — roda a API de verdade (servidor embutido e processos CGI paralelos) e ataca: `../` no id, método errado, sem `X-Lux-Requisicao`, corpo > 5 MB, HTML sem `lux-estado`, chave de API na config e no backup, 11º backup, criação simultânea, sem senha, senha forjada.
- **No servidor de Max:** `npm run deploy` (confere 401/200 também em `/api/backups.php` e que `config.php` não é legível) e `npm run backup:provar` → `OK backup: criar=201 listar=200 baixar=200 zip=200 excluir=200 onze=409 config=200`. A prova só apaga o que ela mesma criou e exige 2 vagas livres.
- A hospedagem tem WAF (ModSecurity): `../` na URL é barrado **antes do PHP** (406); um id malformado sem `../` chega à API e recebe 400.

## Migração entre hospedagens
Ver subetapa 03.8. O código não muda; repetir o spike (`npx tsx scripts/sonda_php.ts`: PHP, `ZipArchive`, usuário autenticado, gravação fora do docroot) e o `npm run deploy` + `npm run backup:provar`. Backups antigos podem ser levados por `baixar_zip` + “Importar versão” (respeita o limite).
