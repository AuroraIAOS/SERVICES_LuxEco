// @vitest-environment node
// Backup (03.6): estado, HTML autossuficiente, restaurar/desfazer e cliente da API (mocks: 200, 401, 409, 413, 422, rede, protegido).
import { describe, expect, it } from 'vitest';
import { DOCUMENTO_FICHAS } from '../dados/fichas';
import { PERGUNTAS_POP } from '../dados/pop';
import type { ArmazenamentoTexto, EstadoFpe } from '../estado/armazenamento';
import { CHAVE_FPE, editarCampo, estadoFpeVazio, lerEstadoFpe } from '../estado/armazenamento';
import type { EstadoPop } from '../estado/pop';
import { CHAVE_POP, editarResposta, estadoPopVazio, lerEstadoPop } from '../estado/pop';
import { valoresPadrao } from '../telas/fpe/modelo';
import { criarCliente, MENSAGEM_LIMITE } from './cliente';
import type { EscopoBackup } from './estado';
import { ABERTURA_BLOCO_ESTADO, CHAVE_DESFAZER, desfazerRestauracao, existeDesfazer, jsonSeguroParaHtml, lerEstadoDoHtml, montarEstadoBackup, restaurarBackup } from './estado';
import { IDS_EXISTENTES, montarBackup, VERSAO_APP } from './gerar_completo';
import { TAMANHO_MAXIMO_BACKUP } from './gerar_html';

const AGORA = new Date(2026, 8, 25, 14, 30);
const ficha = DOCUMENTO_FICHAS.fichas[0]!;
const pergunta = PERGUNTAS_POP.perguntas[0]!;

function fpeEditado(texto = 'Aborda o lead pelo WhatsApp em minutos'): EstadoFpe {
  return editarCampo(estadoFpeVazio(), ficha.id, valoresPadrao(ficha), 'what', texto, '2026-09-25T10:00:00.000Z');
}
const popEditado = (texto = 'Objetivo revisado.'): EstadoPop => editarResposta(estadoPopVazio(), pergunta.id, pergunta.resposta_padrao, texto, '2026-09-25T10:00:00.000Z');

function falsoStorage(inicial: Record<string, string> = {}, opcoes: { setLanca?: boolean } = {}): ArmazenamentoTexto & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => {
      if (opcoes.setLanca) throw new DOMException('cota', 'QuotaExceededError');
      dados.set(k, v);
    },
  };
}

describe('estado do backup', () => {
  it('cada escopo leva só o que cobre', () => {
    const fpe = fpeEditado();
    const pop = popEditado();
    const e = (escopo: EscopoBackup) => montarEstadoBackup(escopo, fpe, pop, AGORA);
    expect(Object.keys(e('fpe').fpe_edicoes)).toHaveLength(1);
    expect(e('fpe').pop_respostas).toEqual({});
    expect(e('pop').fpe_edicoes).toEqual({});
    expect(Object.keys(e('pop').pop_respostas)).toHaveLength(1);
    expect(Object.keys(e('completo').fpe_edicoes)).toHaveLength(1);
    expect(Object.keys(e('completo').pop_respostas)).toHaveLength(1);
    expect(e('completo')).toMatchObject({ schema_versao: 1, gerado_em: AGORA.toISOString() });
  });

  it('o JSON dentro do <script> nunca fecha o script nem quebra linha estranha, e volta idêntico', () => {
    const hostil = { a: '</script><script>alert(1)</script>', b: '<!-- x -->', c: `linha${String.fromCharCode(0x2028)}outra${String.fromCharCode(0x2029)}`, d: 'á “ç” 😀' };
    const s = jsonSeguroParaHtml(hostil);
    expect(s).not.toContain('<');
    expect(s).not.toContain(String.fromCharCode(0x2028));
    expect(s).not.toContain(String.fromCharCode(0x2029));
    expect(JSON.parse(s)).toEqual(hostil);
  });
});

describe('HTML do backup', () => {
  const pronto = (escopo: EscopoBackup = 'completo', rotulo = 'Antes da reunião', fpe = fpeEditado(), pop = popEditado()) => montarBackup(escopo, rotulo, fpe, pop, AGORA);

  it('leva o estado num bloco lux-estado que volta idêntico (ida e volta)', () => {
    const fpe = fpeEditado();
    const pop = popEditado();
    const b = pronto('completo', 'x', fpe, pop);
    const lido = lerEstadoDoHtml(b.html);
    expect(lido).toEqual({ ok: true, estado: montarEstadoBackup('completo', fpe, pop, AGORA) });
    expect(b.html.split(ABERTURA_BLOCO_ESTADO)).toHaveLength(2); // exatamente um bloco
  });

  it('passa na mesma regra que a API PHP aplica (bloco exato, JSON válido, schema 1, sem segredo)', () => {
    for (const escopo of ['fpe', 'pop', 'completo'] as const) {
      const { html } = pronto(escopo);
      const m = /<script type="application\/json" id="lux-estado">(.*?)<\/script>/s.exec(html);
      expect(m, escopo).not.toBeNull();
      const estado = JSON.parse(m![1]!) as Record<string, unknown>;
      expect(estado.schema_versao).toBe(1);
      expect(typeof estado.fpe_edicoes).toBe('object');
      expect(typeof estado.pop_respostas).toBe('object');
      expect(html).not.toMatch(/\bsk-(?:or|ant|proj)[\w-]{6,}/i);
      expect(html).not.toMatch(/api[_-]?key|apikey|senha|password|authorization|bearer/i);
    }
  });

  it('é estático: sem JavaScript, sem rede, sem formulário; só o bloco de estado é <script>', () => {
    const { html } = pronto();
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/<(form|iframe|link|img|object|embed)\b/i);
    expect(html).not.toMatch(/\son\w+\s*=/i);
  });

  it('cabeçalho com marca, rótulo, escopo, data e versão; rodapé com a nota de propriedade intelectual', () => {
    const { html } = pronto('fpe', 'Rascunho <b>1</b>');
    expect(html).toContain('<h1>Versão salva — Rascunho &lt;b&gt;1&lt;/b&gt;</h1>');
    expect(html).toContain('LUX ECO SOLUTIONS');
    expect(html).toContain('FPE · salva em');
    expect(html).toContain(`versão ${VERSAO_APP}`);
    expect(html).toContain('Metodologia de propriedade intelectual do consultor');
    expect(html).toContain('lang="pt-BR"');
  });

  it('cores e fonte só dos tokens da marca', () => {
    const { html } = pronto();
    const css = /<style>(.*?)<\/style>/s.exec(html)![1]!;
    const cores = new Set([...css.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()));
    expect([...cores].sort()).toEqual(['#181F28', '#374A5E', '#F3C51E', '#FEFEFE'].sort());
    expect(css).toContain('"Cyntho Next", sans-serif');
  });

  it('cada escopo mostra só a sua parte', () => {
    expect(pronto('fpe').html).toContain('FPE — fichas 5W1H');
    expect(pronto('fpe').html).not.toContain('POP geral');
    expect(pronto('pop').html).toContain('POP geral');
    expect(pronto('pop').html).not.toContain('FPE — fichas 5W1H');
    expect(pronto('completo').html).toContain('FPE — fichas 5W1H');
    expect(pronto('completo').html).toContain('POP geral');
  });

  it('as edições em vigor aparecem no texto legível', () => {
    const { html } = pronto('completo', '', fpeEditado('Aborda o lead pelo WhatsApp em minutos'), popEditado('Objetivo revisado para o backup.'));
    expect(html).toContain('Aborda o lead pelo WhatsApp em minutos');
    expect(html).toContain('Objetivo revisado para o backup.');
  });

  it('texto hostil nas edições fica escapado no documento e no bloco de estado', () => {
    const { html } = pronto('completo', '', fpeEditado('<img src=x onerror=alert(1)>'), popEditado('</script><script>alert(2)</script>'));
    expect(html).not.toContain('<img');
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    const lido = lerEstadoDoHtml(html);
    expect(lido.ok && lido.estado.pop_respostas[pergunta.id]?.texto).toBe('</script><script>alert(2)</script>');
  });

  it('cabe no limite da API (5 MB) mesmo com as 236 fichas editadas', () => {
    let fpe = estadoFpeVazio();
    for (const f of DOCUMENTO_FICHAS.fichas) fpe = editarCampo(fpe, f.id, valoresPadrao(f), 'how', `${f.how} Ajuste da equipe.`, '2026-09-25T10:00:00.000Z');
    const b = pronto('completo', 'tudo', fpe, popEditado());
    expect(b.bytes).toBeLessThan(TAMANHO_MAXIMO_BACKUP / 2);
    expect(b.grandeDemais).toBe(false);
  });

  it('a versão do app cabe no formato que a API aceita', () => {
    expect(VERSAO_APP).toMatch(/^[0-9A-Za-z._+-]{1,32}$/);
  });

  it('lerEstadoDoHtml recusa o que não é uma versão desta ferramenta', () => {
    const ruins = [
      '<html>nada</html>',
      `${ABERTURA_BLOCO_ESTADO}{"schema_versao":1`,
      `${ABERTURA_BLOCO_ESTADO}{não é json}</script>`,
      `${ABERTURA_BLOCO_ESTADO}{"schema_versao":2,"fpe_edicoes":{},"pop_respostas":{},"gerado_em":"x"}</script>`,
      `${ABERTURA_BLOCO_ESTADO}{"schema_versao":1,"fpe_edicoes":{"a":{"campos":{"what":5},"origem":"manual","atualizado_em":"x"}},"pop_respostas":{},"gerado_em":"x"}</script>`,
      `${ABERTURA_BLOCO_ESTADO}[1,2]</script>`,
    ];
    for (const r of ruins) expect(lerEstadoDoHtml(r).ok, r.slice(0, 50)).toBe(false);
  });
});

describe('restaurar e desfazer', () => {
  const backupCompleto = () => montarEstadoBackup('completo', fpeEditado('Texto do backup'), popEditado('Resposta do backup'), AGORA);
  const guardar = (s: { dados: Map<string, string> }, fpe: EstadoFpe, pop: EstadoPop) => {
    s.dados.set(CHAVE_FPE, JSON.stringify(fpe));
    s.dados.set(CHAVE_POP, JSON.stringify(pop));
  };

  it('completo troca FPE e POP; antes guarda o ponto de desfazer com o estado que havia', () => {
    const s = falsoStorage();
    const antesFpe = fpeEditado('Texto de agora');
    const antesPop = popEditado('Resposta de agora');
    guardar(s, antesFpe, antesPop);
    const r = restaurarBackup(backupCompleto(), 'completo', IDS_EXISTENTES, AGORA, s);
    expect(r).toEqual({ ok: true, ignoradas: 0 });
    expect(lerEstadoFpe(s).estado.fpe_edicoes[ficha.id]?.campos.what).toBe('Texto do backup');
    expect(lerEstadoPop(s).estado.pop_respostas[pergunta.id]?.texto).toBe('Resposta do backup');
    const desfazer = JSON.parse(s.dados.get(CHAVE_DESFAZER)!) as { fpe: EstadoFpe; pop: EstadoPop };
    expect(desfazer.fpe).toEqual(antesFpe);
    expect(desfazer.pop).toEqual(antesPop);
    expect(existeDesfazer(s)).toBe(true);
  });

  it('escopo fpe não mexe no POP; escopo pop não mexe no FPE', () => {
    const s = falsoStorage();
    const fpe0 = fpeEditado('Texto de agora');
    const pop0 = popEditado('Resposta de agora');
    guardar(s, fpe0, pop0);
    restaurarBackup(montarEstadoBackup('fpe', fpeEditado('Texto do backup'), estadoPopVazio(), AGORA), 'fpe', IDS_EXISTENTES, AGORA, s);
    expect(lerEstadoFpe(s).estado.fpe_edicoes[ficha.id]?.campos.what).toBe('Texto do backup');
    expect(lerEstadoPop(s).estado).toEqual(pop0);
    guardar(s, fpe0, pop0);
    restaurarBackup(montarEstadoBackup('pop', estadoFpeVazio(), popEditado('Resposta do backup'), AGORA), 'pop', IDS_EXISTENTES, AGORA, s);
    expect(lerEstadoFpe(s).estado).toEqual(fpe0);
    expect(lerEstadoPop(s).estado.pop_respostas[pergunta.id]?.texto).toBe('Resposta do backup');
  });

  it('o que não existe mais nesta versão da ferramenta é ignorado e contado', () => {
    const s = falsoStorage();
    const estado = backupCompleto();
    estado.fpe_edicoes['ficha_99_99_9'] = estado.fpe_edicoes[ficha.id]!;
    estado.pop_respostas['perg_99_9'] = estado.pop_respostas[pergunta.id]!;
    const r = restaurarBackup(estado, 'completo', IDS_EXISTENTES, AGORA, s);
    expect(r).toEqual({ ok: true, ignoradas: 2 });
    expect(Object.keys(lerEstadoFpe(s).estado.fpe_edicoes)).toEqual([ficha.id]);
    expect(Object.keys(lerEstadoPop(s).estado.pop_respostas)).toEqual([pergunta.id]);
  });

  it('se o navegador não guardar o ponto de desfazer, NADA é restaurado', () => {
    const s = falsoStorage({}, { setLanca: true });
    const r = restaurarBackup(backupCompleto(), 'completo', IDS_EXISTENTES, AGORA, s);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/nada foi restaurado/);
    expect(s.dados.size).toBe(0);
    expect(restaurarBackup(backupCompleto(), 'completo', IDS_EXISTENTES, AGORA, null).ok).toBe(false);
  });

  it('se a gravação falhar no meio, volta ao que havia (sem estado pela metade)', () => {
    const s = falsoStorage();
    const fpe0 = fpeEditado('Texto de agora');
    const pop0 = popEditado('Resposta de agora');
    guardar(s, fpe0, pop0);
    let chamadas = 0;
    const original = s.setItem;
    s.setItem = (k, v) => {
      chamadas++;
      if (k === CHAVE_POP && chamadas > 2 && chamadas < 5) throw new DOMException('cota', 'QuotaExceededError'); // falha só ao gravar o POP restaurado
      original(k, v);
    };
    const r = restaurarBackup(backupCompleto(), 'completo', IDS_EXISTENTES, AGORA, s);
    expect(r.ok).toBe(false);
    expect(lerEstadoFpe(s).estado).toEqual(fpe0);
    expect(lerEstadoPop(s).estado).toEqual(pop0);
  });

  it('desfazer volta ao estado de antes e o estado de depois vira o novo ponto (dá para refazer)', () => {
    const s = falsoStorage();
    const fpe0 = fpeEditado('Texto de agora');
    const pop0 = popEditado('Resposta de agora');
    guardar(s, fpe0, pop0);
    restaurarBackup(backupCompleto(), 'completo', IDS_EXISTENTES, AGORA, s);
    expect(desfazerRestauracao(AGORA, s)).toEqual({ ok: true });
    expect(lerEstadoFpe(s).estado).toEqual(fpe0);
    expect(lerEstadoPop(s).estado).toEqual(pop0);
    expect(desfazerRestauracao(AGORA, s)).toEqual({ ok: true }); // refaz
    expect(lerEstadoFpe(s).estado.fpe_edicoes[ficha.id]?.campos.what).toBe('Texto do backup');
  });

  it('desfazer sem ponto guardado (ou ilegível) não faz nada', () => {
    expect(desfazerRestauracao(AGORA, falsoStorage()).ok).toBe(false);
    expect(desfazerRestauracao(AGORA, falsoStorage({ [CHAVE_DESFAZER]: 'lixo' })).ok).toBe(false);
    expect(existeDesfazer(falsoStorage())).toBe(false);
    expect(desfazerRestauracao(AGORA, null).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
describe('cliente da API', () => {
  const VERSAO = { id: 'bk_20260925_143000_abcdef12', rotulo: 'x', escopo: 'completo', criado_em: '2026-09-25T14:30:00-03:00', tamanho_bytes: 10, sha256: 'a'.repeat(64), versao_app: 'V08', protegido: false };
  const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  function falso(resposta: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    const chamadas: { url: string; init?: RequestInit }[] = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      chamadas.push({ url, init });
      return resposta(url, init);
    }) as unknown as typeof fetch;
    return { chamadas, cliente: criarCliente(fetchFn, './api/backups.php') };
  }

  it('listar: 200 devolve limite, total e itens', async () => {
    const f = falso(() => json({ limite: 10, total: 1, itens: [VERSAO] }));
    expect(await f.cliente.listar()).toEqual({ ok: true, dados: { limite: 10, total: 1, itens: [VERSAO] } });
    expect(f.chamadas[0]!.url).toBe('./api/backups.php?acao=listar');
  });

  it('criar: envia JSON com X-Lux-Requisicao e devolve o item', async () => {
    const f = falso(() => json({ id: VERSAO.id, item: VERSAO, limite: 10, total: 1 }, 201));
    const r = await f.cliente.criar({ html: '<html>', rotulo: 'x', escopo: 'fpe', versao_app: 'V08' });
    expect(r).toMatchObject({ ok: true, dados: { id: VERSAO.id, total: 1 } });
    expect(f.chamadas[0]!.init?.method).toBe('POST');
    expect(f.chamadas[0]!.init?.headers).toMatchObject({ 'X-Lux-Requisicao': '1', 'Content-Type': 'application/json' });
    expect(JSON.parse(String(f.chamadas[0]!.init?.body))).toEqual({ html: '<html>', rotulo: 'x', escopo: 'fpe', versao_app: 'V08' });
  });

  it.each([
    [401, { erro: 'nao_autenticado' }, 'sem_acesso'],
    [409, { erro: 'limite_atingido', limite: 10, total: 10 }, 'limite'],
    [413, { erro: 'backup_grande_demais' }, 'grande_demais'],
    [422, { erro: 'backup_invalido', mensagem: 'O arquivo parece conter uma chave.' }, 'invalido'],
    [404, { erro: 'nao_encontrado' }, 'nao_encontrado'],
    [501, { erro: 'zip_indisponivel' }, 'zip_indisponivel'],
    [500, { erro: 'erro_interno' }, 'erro'],
    [403, { erro: 'requisicao_nao_confiavel' }, 'erro'],
  ] as const)('status %i vira a falha %s, com mensagem simples', async (status, corpo, esperada) => {
    const r = await falso(() => json(corpo, status)).cliente.criar({ html: 'x', rotulo: '', escopo: 'completo', versao_app: 'V08' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.falha).toBe(esperada);
      expect(r.mensagem.length).toBeGreaterThan(10);
      expect(r.status).toBe(status);
    }
  });

  it('409 traz o limite e a mensagem pedida pelo plano; 422 repete a mensagem do servidor', async () => {
    const r409 = await falso(() => json({ erro: 'limite_atingido', limite: 10, total: 10 }, 409)).cliente.criar({ html: 'x', rotulo: '', escopo: 'completo', versao_app: 'V08' });
    expect(!r409.ok && r409.mensagem).toBe('Limite de 10 versões atingido. Exclua versões antigas ou substitua a mais antiga não protegida.');
    expect(!r409.ok && r409.mensagem).toBe(MENSAGEM_LIMITE);
    expect(!r409.ok && r409.extra).toMatchObject({ limite: 10, total: 10 });
    const r422 = await falso(() => json({ erro: 'backup_invalido', mensagem: 'O arquivo parece conter uma chave ou senha.' }, 422)).cliente.criar({ html: 'x', rotulo: '', escopo: 'completo', versao_app: 'V08' });
    expect(!r422.ok && r422.mensagem).toBe('O arquivo parece conter uma chave ou senha.');
  });

  it.each([
    ['erro de rede', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['404 do servidor de desenvolvimento (sem PHP)', () => new Response('nada', { status: 404 })],
    ['a página do app no lugar da API (200 em HTML)', () => new Response('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } })],
    ['406 do WAF da hospedagem', () => new Response('Not Acceptable', { status: 406 })],
  ])('%s → sem_servidor, sem lançar', async (_nome, resposta) => {
    const c = falso(resposta as () => Response).cliente;
    for (const r of [await c.listar(), await c.excluir(['x']), await c.baixarTexto('x'), await c.baixarZip(['x'])]) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.falha).toBe('sem_servidor');
    }
  });

  it('excluir devolve excluídos, protegidos ignorados e inexistentes', async () => {
    const f = falso(() => json({ excluidos: ['a'], ignorados_protegidos: ['b'], inexistentes: ['c'] }));
    expect(await f.cliente.excluir(['a', 'b', 'c'])).toEqual({ ok: true, dados: { excluidos: ['a'], ignorados_protegidos: ['b'], inexistentes: ['c'] } });
    expect(JSON.parse(String(f.chamadas[0]!.init?.body))).toEqual({ ids: ['a', 'b', 'c'] });
  });

  it('renomear e proteger devolvem a versão atualizada', async () => {
    const f = falso(() => json({ item: { ...VERSAO, rotulo: 'novo', protegido: true } }));
    expect(await f.cliente.renomear(VERSAO.id, 'novo')).toMatchObject({ ok: true, dados: { rotulo: 'novo' } });
    expect(JSON.parse(String(f.chamadas[0]!.init?.body))).toEqual({ id: VERSAO.id, rotulo: 'novo' });
    expect(await f.cliente.proteger(VERSAO.id, true)).toMatchObject({ ok: true, dados: { protegido: true } });
    expect(JSON.parse(String(f.chamadas[1]!.init?.body))).toEqual({ id: VERSAO.id, valor: true });
  });

  it('baixarTexto devolve o HTML; baixarZip devolve o blob; urls de baixar e ver levam o id escapado', async () => {
    const f = falso((url) => (url.includes('baixar_zip') ? new Response(new Uint8Array([0x50, 0x4b, 3, 4]), { status: 200, headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="lux_versoes.zip"' } }) : new Response('<html>versão</html>', { status: 200, headers: { 'Content-Type': 'text/html', 'Content-Disposition': 'attachment; filename="bk.html"' } })));
    expect(await f.cliente.baixarTexto(VERSAO.id)).toEqual({ ok: true, dados: '<html>versão</html>' });
    const z = await f.cliente.baixarZip([VERSAO.id]);
    expect(z.ok && z.dados.size).toBe(4);
    expect(f.cliente.urlBaixar('a b&c')).toBe('./api/backups.php?acao=baixar&id=a%20b%26c');
    expect(f.cliente.urlVer(VERSAO.id)).toBe(`./api/backups.php?acao=ver&id=${VERSAO.id}`);
  });

  it('nenhuma requisição leva chave de API', async () => {
    const f = falso(() => json({ limite: 10, total: 0, itens: [] }));
    await f.cliente.listar();
    await f.cliente.criar({ html: '<html>', rotulo: '', escopo: 'completo', versao_app: 'V08' }).catch(() => undefined);
    for (const c of f.chamadas) expect(JSON.stringify(c)).not.toMatch(/sk-|api_key|authorization/i);
  });
});
