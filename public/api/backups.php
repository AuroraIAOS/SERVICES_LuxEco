<?php
// API mínima de backups versionados (03.5) — Lux Ferramentas Operacionais. PHP >= 8, sem dependências (sem Composer).
// Atrás da senha do diretório (cPanel): sem usuário autenticado pelo servidor web → 401. Contrato: docs/07_BACKUP_NO_SERVIDOR.md.
// Regras que não se negociam: id só por regex (o nome de arquivo nunca vem do cliente); mutação só com X-Lux-Requisicao: 1 e JSON;
// máximo de 10 backups (o 11º é recusado com 409, nunca se apaga nada em silêncio); escrita atômica e com trava; nada do
// conteúdo enviado é executado; a API nunca grava chave de API. Nomes em português (snake_case): exceção consciente à regra de TS.
declare(strict_types=1);

const LIMITE_RIGIDO = 10;
const TAMANHO_MAXIMO_HTML = 5 * 1024 * 1024;
const TAMANHO_MAXIMO_CORPO = 8 * 1024 * 1024;
const TAMANHO_MAXIMO_CONFIG = 16 * 1024;
const ROTULO_MAXIMO = 80;
const IDS_POR_PEDIDO = 50;
// \z (e não $): o $ do PCRE aceita um \n no fim e deixaria passar "bk_..._abcdef12\n".
const REGEX_ID = '/^bk_\d{8}_\d{6}_[0-9a-f]{8}\z/';
const ESCOPOS = ['fpe', 'pop', 'completo'];
const REGEX_ID_MODELO = '/^[a-z0-9][\w.-]*\/[\w.-]+:free\z/i';
const REGEX_CAMPO_SECRETO = '/(api[_-]?key|apikey|chave|secret|token|senha|password|authorization|bearer)/i';
const REGEX_CHAVE_NO_TEXTO = '/\bsk-(?:or|ant|proj)[\w-]{6,}/i';

// ---------------------------------------------------------------------------------------------
// Respostas
// ---------------------------------------------------------------------------------------------

function cabecalhos_comuns(): void
{
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
}

function responder_json(int $status, array $dados): never
{
    http_response_code($status);
    cabecalhos_comuns();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

function responder_erro(int $status, string $codigo, string $mensagem, array $extra = []): never
{
    responder_json($status, array_merge(['erro' => $codigo, 'mensagem' => $mensagem], $extra));
}

// ---------------------------------------------------------------------------------------------
// Configuração (gerada no deploy: api/config.php) e autenticação
// ---------------------------------------------------------------------------------------------

function carregar_configuracao(): array
{
    $arquivo = __DIR__ . '/config.php';
    if (!is_file($arquivo)) {
        responder_erro(500, 'configuracao_ausente', 'A API de backups ainda não foi configurada neste servidor.');
    }
    $cfg = require $arquivo;
    if (!is_array($cfg) || !isset($cfg['diretorio']) || !is_string($cfg['diretorio']) || $cfg['diretorio'] === '') {
        responder_erro(500, 'configuracao_invalida', 'A configuração da API de backups está incompleta.');
    }
    $limite = isset($cfg['limite']) ? (int) $cfg['limite'] : LIMITE_RIGIDO;
    $cfg['limite'] = max(1, min(LIMITE_RIGIDO, $limite)); // teto rígido no código
    $cfg['fuso'] = isset($cfg['fuso']) && is_string($cfg['fuso']) ? $cfg['fuso'] : 'America/Sao_Paulo';
    $cfg['modo_teste'] = !empty($cfg['modo_teste']);
    @date_default_timezone_set($cfg['fuso']);
    return $cfg;
}

/**
 * Usuário que o SERVIDOR WEB autenticou. Só REMOTE_USER/REDIRECT_REMOTE_USER valem: o Apache os define depois de conferir a senha.
 * PHP_AUTH_USER vem do cabeçalho enviado pelo cliente e NÃO prova nada; só é aceito no modo de teste local (php -S), que o deploy nunca liga.
 */
function usuario_autenticado(array $cfg): string
{
    foreach (['REMOTE_USER', 'REDIRECT_REMOTE_USER'] as $chave) {
        if (!empty($_SERVER[$chave]) && is_string($_SERVER[$chave])) {
            return $_SERVER[$chave];
        }
    }
    if ($cfg['modo_teste'] && !empty($_SERVER['PHP_AUTH_USER']) && is_string($_SERVER['PHP_AUTH_USER'])) {
        return $_SERVER['PHP_AUTH_USER'];
    }
    return '';
}

function preparar_diretorio(array $cfg): string
{
    $dir = rtrim($cfg['diretorio'], '/\\');
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
        responder_erro(500, 'pasta_indisponivel', 'A pasta dos backups não pôde ser criada no servidor.');
    }
    if (!is_writable($dir)) {
        responder_erro(500, 'pasta_sem_escrita', 'A pasta dos backups não aceita gravação.');
    }
    // Se a pasta estiver dentro da raiz web, ninguém a lê direto: os downloads passam sempre por esta API.
    $raiz = isset($_SERVER['DOCUMENT_ROOT']) ? realpath((string) $_SERVER['DOCUMENT_ROOT']) : false;
    $real = realpath($dir);
    if ($raiz !== false && $real !== false && str_starts_with($real, $raiz) && !is_file($dir . '/.htaccess')) {
        @file_put_contents($dir . '/.htaccess', "Require all denied\n");
    }
    return $real !== false ? $real : $dir;
}

// ---------------------------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------------------------

function exigir_metodo(string $esperado): void
{
    $metodo = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($metodo !== $esperado) {
        header('Allow: ' . $esperado);
        responder_erro(405, 'metodo_nao_permitido', "Esta ação só aceita o método $esperado.");
    }
}

/** Mutação: cabeçalho X-Lux-Requisicao: 1 (bloqueia CSRF de outra origem) e corpo JSON. */
function exigir_mutacao(): void
{
    exigir_metodo('POST');
    if (($_SERVER['HTTP_X_LUX_REQUISICAO'] ?? '') !== '1') {
        responder_erro(403, 'requisicao_nao_confiavel', 'Requisição recusada: faltou o cabeçalho de segurança da ferramenta.');
    }
    $tipo = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
    if ($tipo !== 'application/json') {
        responder_erro(415, 'tipo_nao_aceito', 'Envie o corpo como application/json.');
    }
}

function ler_corpo_json(int $maximo): array
{
    $declarado = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
    if ($declarado > $maximo) {
        responder_erro(413, 'corpo_grande_demais', 'O envio é maior do que o permitido.');
    }
    $bruto = file_get_contents('php://input', false, null, 0, $maximo + 1);
    if ($bruto === false || $bruto === '') {
        responder_erro(400, 'corpo_vazio', 'O envio veio vazio.');
    }
    if (strlen($bruto) > $maximo) {
        responder_erro(413, 'corpo_grande_demais', 'O envio é maior do que o permitido.');
    }
    try {
        $dados = json_decode($bruto, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        responder_erro(400, 'json_invalido', 'O envio não é um JSON válido.');
    }
    if (!is_array($dados)) {
        responder_erro(400, 'json_invalido', 'O envio deve ser um objeto JSON.');
    }
    return $dados;
}

function id_valido(mixed $id): bool
{
    return is_string($id) && preg_match(REGEX_ID, $id) === 1;
}

function exigir_id(mixed $id): string
{
    if (!id_valido($id)) {
        responder_erro(400, 'id_invalido', 'Identificador de versão inválido.');
    }
    return $id;
}

/** `ids[]` do corpo: lista de ids válidos, sem repetição, até IDS_POR_PEDIDO. */
function exigir_lista_de_ids(array $corpo): array
{
    $ids = $corpo['ids'] ?? null;
    if (!is_array($ids) || !array_is_list($ids) || count($ids) === 0 || count($ids) > IDS_POR_PEDIDO) {
        responder_erro(400, 'ids_invalidos', 'Informe de 1 a ' . IDS_POR_PEDIDO . ' versões.');
    }
    foreach ($ids as $id) {
        exigir_id($id);
    }
    return array_values(array_unique($ids));
}

function limpar_rotulo(mixed $rotulo): string
{
    if ($rotulo === null) {
        return '';
    }
    if (!is_string($rotulo) || !mb_check_encoding($rotulo, 'UTF-8')) {
        responder_erro(400, 'rotulo_invalido', 'O rótulo deve ser um texto.');
    }
    $limpo = trim((string) preg_replace('/[\x00-\x1F\x7F]/u', '', $rotulo));
    return mb_substr($limpo, 0, ROTULO_MAXIMO);
}

// ---------------------------------------------------------------------------------------------
// Armazenamento: bk_<id>.html + bk_<id>_meta.json, escrita atômica, trava para o limite
// ---------------------------------------------------------------------------------------------

function caminho_html(string $dir, string $id): string
{
    return $dir . '/' . $id . '.html';
}

function caminho_meta(string $dir, string $id): string
{
    return $dir . '/' . $id . '_meta.json';
}

function ler_meta(string $dir, string $id): ?array
{
    $arquivo = caminho_meta($dir, $id);
    if (!is_file($arquivo)) {
        return null;
    }
    $bruto = @file_get_contents($arquivo);
    $meta = is_string($bruto) ? json_decode($bruto, true) : null;
    return is_array($meta) ? $meta : null;
}

function listar_ids(string $dir): array
{
    $ids = [];
    foreach (glob($dir . '/bk_*_meta.json') ?: [] as $arquivo) {
        $id = substr(basename($arquivo), 0, -strlen('_meta.json'));
        if (id_valido($id) && is_file(caminho_html($dir, $id))) {
            $ids[] = $id;
        }
    }
    return $ids;
}

function gravar_atomico(string $destino, string $conteudo): void
{
    $tmp = $destino . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, $conteudo, LOCK_EX) === false) {
        @unlink($tmp);
        throw new RuntimeException('falha ao gravar');
    }
    if (!@rename($tmp, $destino)) {
        @unlink($tmp);
        throw new RuntimeException('falha ao renomear');
    }
}

/** Trava exclusiva da pasta: duas requisições simultâneas não furam o limite. Devolve o recurso a ser passado a liberar_trava. */
function pegar_trava(string $dir)
{
    $trava = fopen($dir . '/.trava', 'c');
    if ($trava === false || !flock($trava, LOCK_EX)) {
        responder_erro(503, 'ocupado', 'O servidor está ocupado. Tente de novo em instantes.');
    }
    return $trava;
}

function liberar_trava($trava): void
{
    flock($trava, LOCK_UN);
    fclose($trava);
}

// ---------------------------------------------------------------------------------------------
// Validação do backup: HTML com o bloco lux-estado válido e sem segredo
// ---------------------------------------------------------------------------------------------

function tem_campo_secreto(mixed $valor): bool
{
    if (!is_array($valor)) {
        return false;
    }
    foreach ($valor as $chave => $filho) {
        if (is_string($chave) && preg_match(REGEX_CAMPO_SECRETO, $chave) === 1) {
            return true;
        }
        if (tem_campo_secreto($filho)) {
            return true;
        }
    }
    return false;
}

/** Devolve [estado, null] se o HTML for aceitável, ou [null, mensagem]. Nada do HTML é executado nem interpretado. */
function validar_html_do_backup(string $html): array
{
    if (!mb_check_encoding($html, 'UTF-8')) {
        return [null, 'O arquivo não está em UTF-8.'];
    }
    if (preg_match('/<script type="application\/json" id="lux-estado">(.*?)<\/script>/s', $html, $m) !== 1) {
        return [null, 'O arquivo não tem o bloco lux-estado.'];
    }
    try {
        $estado = json_decode($m[1], true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        return [null, 'O bloco lux-estado não é um JSON válido.'];
    }
    if (!is_array($estado) || ($estado['schema_versao'] ?? null) !== 1 || !isset($estado['fpe_edicoes'], $estado['pop_respostas']) || !is_array($estado['fpe_edicoes']) || !is_array($estado['pop_respostas'])) {
        return [null, 'O bloco lux-estado não tem o formato esperado.'];
    }
    if (tem_campo_secreto($estado) || preg_match(REGEX_CHAVE_NO_TEXTO, $html) === 1) {
        return [null, 'O arquivo parece conter uma chave ou senha; ela nunca é guardada.'];
    }
    return [$estado, null];
}

// ---------------------------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------------------------

function meta_publica(string $id, array $meta): array
{
    return [
        'id' => $id,
        'rotulo' => (string) ($meta['rotulo'] ?? ''),
        'escopo' => (string) ($meta['escopo'] ?? 'completo'),
        'criado_em' => (string) ($meta['criado_em'] ?? ''),
        'tamanho_bytes' => (int) ($meta['tamanho_bytes'] ?? 0),
        'sha256' => (string) ($meta['sha256'] ?? ''),
        'versao_app' => (string) ($meta['versao_app'] ?? ''),
        'protegido' => !empty($meta['protegido']),
    ];
}

function acao_listar(string $dir, array $cfg): never
{
    exigir_metodo('GET');
    $itens = [];
    foreach (listar_ids($dir) as $id) {
        $meta = ler_meta($dir, $id);
        if ($meta !== null) {
            $itens[] = meta_publica($id, $meta);
        }
    }
    usort($itens, fn(array $a, array $b) => [$b['criado_em'], $b['id']] <=> [$a['criado_em'], $a['id']]);
    responder_json(200, ['limite' => $cfg['limite'], 'total' => count($itens), 'itens' => $itens]);
}

function acao_criar(string $dir, array $cfg): never
{
    exigir_mutacao();
    $corpo = ler_corpo_json(TAMANHO_MAXIMO_CORPO);
    $html = $corpo['html'] ?? null;
    if (!is_string($html) || $html === '') {
        responder_erro(400, 'html_ausente', 'O envio não trouxe o HTML do backup.');
    }
    if (strlen($html) > TAMANHO_MAXIMO_HTML) {
        responder_erro(413, 'backup_grande_demais', 'O backup passa de 5 MB e não foi guardado.');
    }
    $escopo = $corpo['escopo'] ?? 'completo';
    if (!is_string($escopo) || !in_array($escopo, ESCOPOS, true)) {
        responder_erro(400, 'escopo_invalido', 'O escopo deve ser fpe, pop ou completo.');
    }
    $versao_app = $corpo['versao_app'] ?? '';
    if (!is_string($versao_app) || ($versao_app !== '' && preg_match('/^[0-9A-Za-z._+-]{1,32}\z/', $versao_app) !== 1)) {
        responder_erro(400, 'versao_invalida', 'A versão do app tem caracteres não aceitos.');
    }
    $rotulo = limpar_rotulo($corpo['rotulo'] ?? null);
    [$estado, $motivo] = validar_html_do_backup($html);
    if ($estado === null) {
        responder_erro(422, 'backup_invalido', (string) $motivo);
    }

    $trava = pegar_trava($dir);
    try {
        $total = count(listar_ids($dir));
        if ($total >= $cfg['limite']) {
            responder_erro(409, 'limite_atingido', 'Limite de versões atingido. Exclua uma versão antiga antes de salvar.', ['limite' => $cfg['limite'], 'total' => $total]);
        }
        $id = 'bk_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4));
        $meta = [
            'rotulo' => $rotulo,
            'escopo' => $escopo,
            'criado_em' => date('c'),
            'tamanho_bytes' => strlen($html),
            'sha256' => hash('sha256', $html),
            'versao_app' => $versao_app,
            'protegido' => false,
        ];
        gravar_atomico(caminho_html($dir, $id), $html);
        try {
            gravar_atomico(caminho_meta($dir, $id), json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        } catch (Throwable $e) {
            @unlink(caminho_html($dir, $id));
            throw $e;
        }
    } finally {
        liberar_trava($trava);
    }
    responder_json(201, ['id' => $id, 'item' => meta_publica($id, $meta), 'limite' => $cfg['limite'], 'total' => $total + 1]);
}

function enviar_html(string $dir, string $id, bool $inline): never
{
    $arquivo = caminho_html($dir, $id);
    if (!is_file($arquivo) || ler_meta($dir, $id) === null) {
        responder_erro(404, 'nao_encontrado', 'Versão não encontrada.');
    }
    cabecalhos_comuns();
    header('Content-Type: text/html; charset=utf-8');
    // Sem scripts, sem rede, sem formulários: o backup é um documento estático mesmo se alguém o alterar.
    header("Content-Security-Policy: sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:");
    header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename="' . $id . '.html"');
    header('Content-Length: ' . (string) filesize($arquivo));
    readfile($arquivo);
    exit;
}

function acao_baixar(string $dir): never
{
    exigir_metodo('GET');
    enviar_html($dir, exigir_id($_GET['id'] ?? null), false);
}

function acao_ver(string $dir): never
{
    exigir_metodo('GET');
    enviar_html($dir, exigir_id($_GET['id'] ?? null), true);
}

function acao_baixar_zip(string $dir): never
{
    exigir_mutacao();
    if (!class_exists('ZipArchive')) {
        responder_erro(501, 'zip_indisponivel', 'Este servidor não monta arquivos .zip. Baixe as versões uma a uma.');
    }
    $ids = exigir_lista_de_ids(ler_corpo_json(TAMANHO_MAXIMO_CONFIG));
    foreach ($ids as $id) {
        if (ler_meta($dir, $id) === null || !is_file(caminho_html($dir, $id))) {
            responder_erro(404, 'nao_encontrado', 'Uma das versões pedidas não existe.');
        }
    }
    $tmp = tempnam(sys_get_temp_dir(), 'luxzip');
    if ($tmp === false) {
        responder_erro(500, 'erro_interno', 'Não foi possível montar o arquivo .zip.');
    }
    register_shutdown_function(static function () use ($tmp): void {
        @unlink($tmp);
    });
    $zip = new ZipArchive();
    if ($zip->open($tmp, ZipArchive::OVERWRITE | ZipArchive::CREATE) !== true) {
        responder_erro(500, 'erro_interno', 'Não foi possível montar o arquivo .zip.');
    }
    foreach ($ids as $id) {
        $zip->addFile(caminho_html($dir, $id), $id . '.html');
    }
    if (!$zip->close()) {
        responder_erro(500, 'erro_interno', 'Não foi possível montar o arquivo .zip.');
    }
    cabecalhos_comuns();
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="lux_versoes_' . date('Y-m-d') . '.zip"');
    header('Content-Length: ' . (string) filesize($tmp));
    readfile($tmp);
    exit;
}

function acao_excluir(string $dir): never
{
    exigir_mutacao();
    $ids = exigir_lista_de_ids(ler_corpo_json(TAMANHO_MAXIMO_CONFIG));
    $excluidos = [];
    $protegidos = [];
    $inexistentes = [];
    $trava = pegar_trava($dir);
    try {
        foreach ($ids as $id) {
            $meta = ler_meta($dir, $id);
            if ($meta === null) {
                $inexistentes[] = $id;
            } elseif (!empty($meta['protegido'])) {
                $protegidos[] = $id; // nunca entra em exclusão (unitária ou em lote)
            } else {
                @unlink(caminho_meta($dir, $id));
                @unlink(caminho_html($dir, $id));
                $excluidos[] = $id;
            }
        }
    } finally {
        liberar_trava($trava);
    }
    responder_json(200, ['excluidos' => $excluidos, 'ignorados_protegidos' => $protegidos, 'inexistentes' => $inexistentes]);
}

function alterar_meta(string $dir, string $id, callable $mudar): array
{
    $trava = pegar_trava($dir);
    try {
        $meta = ler_meta($dir, $id);
        if ($meta === null) {
            responder_erro(404, 'nao_encontrado', 'Versão não encontrada.');
        }
        $meta = $mudar($meta);
        gravar_atomico(caminho_meta($dir, $id), json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        return $meta;
    } finally {
        liberar_trava($trava);
    }
}

function acao_renomear(string $dir): never
{
    exigir_mutacao();
    $corpo = ler_corpo_json(TAMANHO_MAXIMO_CONFIG);
    $id = exigir_id($corpo['id'] ?? null);
    if (!is_string($corpo['rotulo'] ?? null)) {
        responder_erro(400, 'rotulo_invalido', 'Informe o novo rótulo como texto.');
    }
    $rotulo = limpar_rotulo($corpo['rotulo']);
    $meta = alterar_meta($dir, $id, static function (array $m) use ($rotulo): array {
        $m['rotulo'] = $rotulo;
        return $m;
    });
    responder_json(200, ['item' => meta_publica($id, $meta)]);
}

function acao_proteger(string $dir): never
{
    exigir_mutacao();
    $corpo = ler_corpo_json(TAMANHO_MAXIMO_CONFIG);
    $id = exigir_id($corpo['id'] ?? null);
    if (!is_bool($corpo['valor'] ?? null)) {
        responder_erro(400, 'valor_invalido', 'Informe valor como verdadeiro ou falso.');
    }
    $valor = $corpo['valor'];
    $meta = alterar_meta($dir, $id, static function (array $m) use ($valor): array {
        $m['protegido'] = $valor;
        return $m;
    });
    responder_json(200, ['item' => meta_publica($id, $meta)]);
}

// ---------------------------------------------------------------------------------------------
// config_llm: só números em faixas e ids de modelo :free. Nunca chave de API.
// ---------------------------------------------------------------------------------------------

function validar_config_llm(array $c): ?string
{
    $permitidas = ['schema_versao', 'teto_mensal_brl', 'alerta_percentual', 'limite_diario_requisicoes', 'modelos', 'preco_entrada_brl_por_milhao', 'preco_saida_brl_por_milhao', 'atualizado_em'];
    foreach (array_keys($c) as $chave) {
        if (!in_array($chave, $permitidas, true)) {
            return is_string($chave) && preg_match(REGEX_CAMPO_SECRETO, $chave) === 1 ? 'A configuração não pode conter chave de API.' : "Campo não aceito: $chave.";
        }
    }
    if (($c['schema_versao'] ?? null) !== 1) {
        return 'schema_versao deve ser 1.';
    }
    $numero = static fn(mixed $v, float $min, float $max): bool => (is_int($v) || is_float($v)) && is_finite((float) $v) && $v >= $min && $v <= $max;
    if (!$numero($c['teto_mensal_brl'] ?? null, 0, 10000)) {
        return 'O teto mensal deve estar entre 0 e 10.000.';
    }
    if (!is_int($c['alerta_percentual'] ?? null) || !$numero($c['alerta_percentual'], 1, 100)) {
        return 'O alerta deve ser um inteiro de 1 a 100.';
    }
    if (!is_int($c['limite_diario_requisicoes'] ?? null) || !$numero($c['limite_diario_requisicoes'], 0, 100000)) {
        return 'O limite diário deve ser um inteiro de 0 a 100.000.';
    }
    foreach (['preco_entrada_brl_por_milhao', 'preco_saida_brl_por_milhao'] as $preco) {
        if (array_key_exists($preco, $c) && !$numero($c[$preco], 0, 10000)) {
            return 'Os preços devem estar entre 0 e 10.000.';
        }
    }
    $modelos = $c['modelos'] ?? null;
    if (!is_array($modelos) || !array_is_list($modelos) || count($modelos) < 1 || count($modelos) > 3) {
        return 'Informe de 1 a 3 modelos.';
    }
    foreach ($modelos as $m) {
        if (!is_string($m) || preg_match(REGEX_ID_MODELO, $m) !== 1) {
            return 'Os modelos devem ser ids gratuitos (terminam em :free).';
        }
    }
    if (count(array_unique($modelos)) !== count($modelos)) {
        return 'Os modelos não podem se repetir.';
    }
    if (!is_string($c['atualizado_em'] ?? null) || strlen($c['atualizado_em']) > 40) {
        return 'atualizado_em deve ser um texto curto.';
    }
    return null;
}

function acao_config_ler(string $dir): never
{
    exigir_metodo('GET');
    $arquivo = $dir . '/configuracao_llm.json';
    if (!is_file($arquivo)) {
        responder_json(200, ['existe' => false, 'config' => null]);
    }
    $config = json_decode((string) @file_get_contents($arquivo), true);
    if (!is_array($config) || validar_config_llm($config) !== null) {
        responder_json(200, ['existe' => false, 'config' => null]); // arquivo estragado: a ferramenta volta ao padrão do build
    }
    responder_json(200, ['existe' => true, 'config' => $config]);
}

function acao_config_gravar(string $dir): never
{
    exigir_mutacao();
    $config = ler_corpo_json(TAMANHO_MAXIMO_CONFIG);
    $erro = validar_config_llm($config);
    if ($erro !== null) {
        responder_erro(422, 'config_invalida', $erro);
    }
    $trava = pegar_trava($dir);
    try {
        gravar_atomico($dir . '/configuracao_llm.json', json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    } finally {
        liberar_trava($trava);
    }
    responder_json(200, ['config' => $config]);
}

// ---------------------------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------------------------

set_error_handler(static function (int $nivel, string $mensagem, string $arquivo, int $linha): bool {
    if ((error_reporting() & $nivel) === 0) {
        return false; // erro suprimido com @: deixa o PHP seguir
    }
    throw new ErrorException($mensagem, 0, $nivel, $arquivo, $linha);
});
ini_set('display_errors', '0');

try {
    $cfg = carregar_configuracao();
    if (usuario_autenticado($cfg) === '') {
        header('WWW-Authenticate: Basic realm="Lux Ferramentas Operacionais"');
        responder_erro(401, 'nao_autenticado', 'Acesso restrito: entre com o usuário e a senha da ferramenta.');
    }
    $dir = preparar_diretorio($cfg);
    $acao = $_GET['acao'] ?? '';
    match ($acao) {
        'listar' => acao_listar($dir, $cfg),
        'criar' => acao_criar($dir, $cfg),
        'baixar' => acao_baixar($dir),
        'ver' => acao_ver($dir),
        'baixar_zip' => acao_baixar_zip($dir),
        'excluir' => acao_excluir($dir),
        'renomear' => acao_renomear($dir),
        'proteger' => acao_proteger($dir),
        'config_ler' => acao_config_ler($dir),
        'config_gravar' => acao_config_gravar($dir),
        default => responder_erro(400, 'acao_invalida', 'Ação desconhecida.'),
    };
} catch (Throwable $e) {
    @error_log('[lux backups] ' . get_class($e) . ': ' . $e->getMessage());
    responder_erro(500, 'erro_interno', 'Erro no servidor. Nada foi apagado. Tente de novo.');
}
