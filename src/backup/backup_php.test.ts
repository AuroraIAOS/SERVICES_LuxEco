// @vitest-environment node
// O HTML que o APP gera passa pela validação do PHP de verdade e volta idêntico do servidor (03.6). Não entra no `tsc` do app
// (usa módulos de Node); o Vitest o executa normalmente. Sem PHP, falha com instrução (nunca pula).
import { afterAll, describe, expect, it } from 'vitest';
import { subirApi, AUTH_TESTE } from '../../scripts/api_local.ts';
import { DOCUMENTO_FICHAS } from '../dados/fichas';
import { PERGUNTAS_POP } from '../dados/pop';
import { editarCampo, estadoFpeVazio } from '../estado/armazenamento';
import { editarResposta, estadoPopVazio } from '../estado/pop';
import { valoresPadrao } from '../telas/fpe/modelo';
import { criarCliente } from './cliente';
import type { EscopoBackup } from './estado';
import { lerEstadoDoHtml } from './estado';
import { montarBackup, VERSAO_APP } from './gerar_completo';

const AGORA = new Date(2026, 8, 25, 14, 30);
const pergunta = PERGUNTAS_POP.perguntas[0]!;
const ambiente = await subirApi();
afterAll(() => ambiente.parar());

/** O cliente de verdade, apontado para o PHP local (com o cabeçalho de senha do modo de teste). */
const cliente = criarCliente(((url: string, init?: RequestInit) => fetch(`${ambiente.url}${String(url).replace('./api/backups.php', '')}`, { ...init, headers: { ...init?.headers, Authorization: AUTH_TESTE } })) as typeof fetch);

function estadosCheios() {
  let fpe = estadoFpeVazio();
  for (const f of DOCUMENTO_FICHAS.fichas) fpe = editarCampo(fpe, f.id, valoresPadrao(f), 'how', `${f.how} Ajuste da equipe com acentos: ção “aspas”.`, '2026-09-25T10:00:00.000Z');
  return { fpe, pop: editarResposta(estadoPopVazio(), pergunta.id, pergunta.resposta_padrao, 'Resposta com <b>HTML</b> & </script> dentro.', '2026-09-25T10:00:00.000Z') };
}

describe('o backup gerado pelo app contra a API PHP real', () => {
  it.each(['fpe', 'pop', 'completo'] as const)('escopo %s: o PHP aceita (201) e devolve o HTML byte a byte, com o estado restaurável', async (escopo: EscopoBackup) => {
    const { fpe, pop } = estadosCheios();
    const b = montarBackup(escopo, `Prova ${escopo}`, fpe, pop, AGORA);
    const c = await cliente.criar({ html: b.html, rotulo: `Prova ${escopo}`, escopo, versao_app: VERSAO_APP });
    expect(c.ok, JSON.stringify(c)).toBe(true);
    if (!c.ok) return;
    expect(c.dados.item).toMatchObject({ escopo, rotulo: `Prova ${escopo}`, versao_app: VERSAO_APP, tamanho_bytes: b.bytes });

    const baixado = await cliente.baixarTexto(c.dados.id);
    expect(baixado).toEqual({ ok: true, dados: b.html });
    const lido = baixado.ok ? lerEstadoDoHtml(baixado.dados) : null;
    expect(lido?.ok).toBe(true);
    if (lido?.ok) {
      expect(Object.keys(lido.estado.fpe_edicoes)).toHaveLength(escopo === 'pop' ? 0 : DOCUMENTO_FICHAS.fichas.length);
      expect(Object.keys(lido.estado.pop_respostas)).toHaveLength(escopo === 'fpe' ? 0 : 1);
    }
    expect((await cliente.excluir([c.dados.id])).ok).toBe(true);
  });

  it('resposta do POP com algo que parece chave de API: o PHP recusa (422) e a mensagem chega à pessoa', async () => {
    const chaveFalsa = ['sk', 'or', 'v1', 'exemplo', 'falso', 'de', 'teste'].join('-');
    const pop = editarResposta(estadoPopVazio(), pergunta.id, pergunta.resposta_padrao, `Minha chave é ${chaveFalsa}`, '2026-09-25T10:00:00.000Z');
    const b = montarBackup('pop', 'x', estadoFpeVazio(), pop, AGORA);
    const c = await cliente.criar({ html: b.html, rotulo: 'x', escopo: 'pop', versao_app: VERSAO_APP });
    expect(c.ok).toBe(false);
    if (!c.ok) {
      expect(c.falha).toBe('invalido');
      expect(c.mensagem).toMatch(/chave ou senha/);
    }
    expect((await cliente.listar()).ok && (await cliente.listar()).ok).toBe(true);
    const l = await cliente.listar();
    expect(l.ok && l.dados.total).toBe(0);
  });

  it('o ciclo pelo cliente: criar 10, o 11º volta como limite, proteger, excluir em lote poupa o protegido, zip', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const b = montarBackup('fpe', `v${i}`, estadoFpeVazio(), estadoPopVazio(), AGORA);
      const c = await cliente.criar({ html: b.html, rotulo: `v${i}`, escopo: 'fpe', versao_app: VERSAO_APP });
      expect(c.ok).toBe(true);
      if (c.ok) ids.push(c.dados.id);
    }
    const onze = await cliente.criar({ html: montarBackup('fpe', 'onze', estadoFpeVazio(), estadoPopVazio(), AGORA).html, rotulo: 'onze', escopo: 'fpe', versao_app: VERSAO_APP });
    expect(!onze.ok && onze.falha).toBe('limite');
    expect(!onze.ok && onze.mensagem).toBe('Limite de 10 versões atingido. Exclua versões antigas ou substitua a mais antiga não protegida.');

    expect((await cliente.proteger(ids[0]!, true)).ok).toBe(true);
    const z = await cliente.baixarZip(ids.slice(0, 3));
    expect(z.ok && z.dados.size).toBeGreaterThan(100);
    const e = await cliente.excluir(ids);
    expect(e.ok && e.dados.excluidos).toHaveLength(9);
    expect(e.ok && e.dados.ignorados_protegidos).toEqual([ids[0]]);
    await cliente.proteger(ids[0]!, false);
    await cliente.excluir([ids[0]!]);
    const l = await cliente.listar();
    expect(l.ok && l.dados.total).toBe(0);
  }, 60_000);
});
