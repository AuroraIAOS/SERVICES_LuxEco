// @vitest-environment node
// Estado do POP no navegador (03.1): leitura validada, cópia do que estiver ilegível, edição que volta ao padrão desfaz.
import { describe, expect, it } from 'vitest';
import type { ArmazenamentoTexto } from './armazenamento';
import { CHAVE_POP, CHAVE_POP_INVALIDO, editarResposta, estadoPopVazio, gravarEstadoPop, lerEstadoPop, respostasDoEstado, restaurarResposta } from './pop';

const AGORA = '2026-09-25T12:00:00.000Z';

function falso(bruto?: string, opcoes: { setLanca?: boolean; getLanca?: boolean } = {}): ArmazenamentoTexto & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  if (bruto !== undefined) dados.set(CHAVE_POP, bruto);
  return {
    dados,
    getItem: (k) => {
      if (opcoes.getLanca) throw new DOMException('bloqueado', 'SecurityError');
      return dados.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (opcoes.setLanca) throw new DOMException('cota', 'QuotaExceededError');
      dados.set(k, v);
    },
  };
}

describe('leitura', () => {
  it('sem storage, storage que lança ou vazio: estado vazio, com a origem certa', () => {
    expect(lerEstadoPop(null)).toEqual({ estado: estadoPopVazio(), origem: 'indisponivel' });
    expect(lerEstadoPop(falso(undefined, { getLanca: true })).origem).toBe('indisponivel');
    expect(lerEstadoPop(falso()).origem).toBe('vazio');
  });

  it('lê o que gravou (ida e volta)', () => {
    const s = falso();
    const e = editarResposta(estadoPopVazio(), 'perg_02_4', 'padrão', 'Minha resposta com acentos: ção.', AGORA);
    expect(gravarEstadoPop(e, s)).toBe(true);
    expect(lerEstadoPop(s)).toEqual({ estado: e, origem: 'armazenamento' });
  });

  it.each([['JSON quebrado', '{não é json'], ['forma errada', '{"schema_versao":1,"pop_respostas":{"perg":{"texto":1}}}'], ['versão desconhecida', '{"schema_versao":2,"pop_respostas":{}}']])(
    '%s: estado vazio e cópia do texto original',
    (_nome, bruto) => {
      const s = falso(bruto);
      const r = lerEstadoPop(s);
      expect(r.origem).toBe('corrompido');
      expect(r.estado).toEqual(estadoPopVazio());
      expect(s.dados.get(CHAVE_POP_INVALIDO)).toBe(bruto);
    },
  );

  it('sem espaço para a cópia, ainda devolve o estado vazio', () => {
    const s = falso('{quebrado', { setLanca: true });
    expect(lerEstadoPop(s).origem).toBe('corrompido');
  });
});

describe('gravação', () => {
  it('devolve false quando o navegador recusa ou não há storage', () => {
    expect(gravarEstadoPop(estadoPopVazio(), falso(undefined, { setLanca: true }))).toBe(false);
    expect(gravarEstadoPop(estadoPopVazio(), null)).toBe(false);
  });
});

describe('edição', () => {
  const vazio = estadoPopVazio();

  it('resposta diferente do padrão vira edição manual; igual ao padrão desfaz', () => {
    const e = editarResposta(vazio, 'p1', 'padrão', 'novo', AGORA);
    expect(e.pop_respostas.p1).toEqual({ texto: 'novo', origem: 'manual', atualizado_em: AGORA });
    expect(editarResposta(e, 'p1', 'padrão', 'padrão', AGORA)).toEqual(vazio);
  });

  it('não muda o estado anterior (imutável) e devolve o mesmo objeto quando nada muda', () => {
    const e = editarResposta(vazio, 'p1', 'padrão', 'novo', AGORA);
    expect(vazio.pop_respostas).toEqual({});
    expect(editarResposta(vazio, 'p1', 'padrão', 'padrão', AGORA)).toBe(vazio);
    expect(restaurarResposta(vazio, 'p1')).toBe(vazio);
    expect(restaurarResposta(e, 'p1')).toEqual(vazio);
  });

  it('texto vazio é uma edição válida (o dado fica; a tela avisa)', () => {
    expect(editarResposta(vazio, 'p1', 'padrão', '', AGORA).pop_respostas.p1?.texto).toBe('');
  });

  it('respostasDoEstado entrega { id: texto } para o gerador', () => {
    const e = editarResposta(editarResposta(vazio, 'p1', 'a', 'x', AGORA), 'p2', 'b', 'y', AGORA);
    expect(respostasDoEstado(e)).toEqual({ p1: 'x', p2: 'y' });
  });
});
