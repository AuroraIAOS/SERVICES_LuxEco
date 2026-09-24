# 07 — BACKUP VERSIONADO NO SERVIDOR

Decisão de 24/09/2026 (Max): sem Google Drive/OAuth. Backups HTML ficam no servidor da hospedagem, **máximo de 10**, geridos na tela `#/versoes`. Implementação nas subetapas 03.5 (API) e 03.6 (tela) de `docs/00_PLANO_E_CRITERIOS.md`.

## Contrato da API (`public/api/backups.php`)
Tudo atrás da senha de diretório do cPanel (sem usuário autenticado → 401). Mutações exigem `X-Lux-Requisicao: 1`.

| Ação | Método | Entrada | Saída |
|---|---|---|---|
| `listar` | GET | — | `200 {limite, total, itens:[versao_backup]}` |
| `criar` | POST | corpo `.html` + `rotulo`, `escopo`, `versao_app` | `201 {id}`; `409 limite_atingido` se já há 10; `413` > 5 MB; `422` se faltar o bloco `lux-estado` válido |
| `baixar` | GET | `id` | `.html` como anexo; `400` id inválido; `404` |
| `baixar_zip` | POST | `ids[]` | `.zip` (nomes `bk_*.html`) |
| `excluir` | POST | `ids[]` | `200 {excluidos, ignorados_protegidos}` |
| `renomear` | POST | `id`, `rotulo` (≤ 80 caracteres) | `200` |
| `proteger` | POST | `id`, `valor` | `200` |
| `config_ler` | GET | — | `200 config_llm` (ou o padrão do build se não existir) |
| `config_gravar` | POST | `config_llm` JSON | `200`; `422` se fora das faixas ou se contiver chave de API |
| `ver` | GET | `id` | `.html` inline com `Content-Security-Policy: sandbox` |

`id`: `^bk_\d{8}_\d{6}_[0-9a-f]{8}$`, gerado no servidor. Rótulo sempre tratado como texto.

## Anatomia do backup `.html`
1. Renderização estática do FPE e/ou POP (tokens de marca embutidos, imprimível, sem JS obrigatório).
2. `<script type="application/json" id="lux-estado">` com `estado_backup { schema_versao, fpe_edicoes, pop_respostas, gerado_em }`.
3. Cabeçalho com data, rótulo, versão do app e a nota de propriedade intelectual de `docs/05`.

## Regras de operação
- 11º backup: 409; a interface oferece “excluir o mais antigo não protegido e salvar” (ação explícita, com confirmação).
- Exclusão em lote sempre pede confirmação e poupa itens protegidos.
- Restaurar substitui o estado local; antes, o app guarda um ponto de desfazer em `localStorage`.
- Sem servidor de backup (offline/`localhost`): “Salvar versão” desativado; “Baixar arquivo” continua.
- Cópia fora do servidor é responsabilidade do contratante (baixar `.zip`); o guia explica.

## Migração entre hospedagens
Ver subetapa 03.8. O código não muda; repetir o spike (PHP, `ZipArchive`, usuário autenticado, gravação em `BACKUP_DIR_SERVIDOR`). Backups antigos podem ser levados por `baixar_zip` + “Importar versão” (respeita o limite).
