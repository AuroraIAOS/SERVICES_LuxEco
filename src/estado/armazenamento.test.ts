import { beforeEach, describe, expect, it } from 'vitest';
import type { ArmazenamentoTexto, EstadoFpe, ValoresFicha } from './armazenamento';
import { CAMPOS_FICHA, CHAVE_FPE, CHAVE_FPE_INVALIDO, armazenamentoDoNavegador, editarCampo, estadoFpeVazio, gravarEstadoFpe, lerEstadoFpe, restaurarFicha, valoresEfetivos } from './armazenamento';

/** Storage falso em memória, com falhas programáveis. */
function falso(opcoes: { getLanca?: boolean; setLanca?: boolean } = {}): ArmazenamentoTexto & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (k) => {
      if (opcoes.getLanca) throw new Error('acesso negado');
      return dados.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (opcoes.setLanca) throw new DOMException('cota cheia', 'QuotaExceededError');
      dados.set(k, v);
    },
  };
}

const PADRAO: ValoresFicha = { what: 'Aborda o lead', why: 'Iniciar o atendimento', where: 'Contato com o cliente', when: 'Est. 02', who: 'Vendas (Vendedor)', how: 'Entra em contato' };
const AGORA = '2026-09-24T22:00:00.000Z';

describe('leitura do estado guardado', () => {
  it('sem nada guardado: estado vazio (origem "vazio"), pronto para uso', () => {
    const r = lerEstadoFpe(falso());
    expect(r.origem).toBe('vazio');
    expect(r.estado).toEqual(estadoFpeVazio());
    expect(r.estado.schema_versao).toBe(1);
  });

  it('storage inexistente ou que lança ao ler: funciona em memória (origem "indisponivel")', () => {
    expect(lerEstadoFpe(null).origem).toBe('indisponivel');
    expect(lerEstadoFpe(falso({ getLanca: true })).origem).toBe('indisponivel');
    expect(lerEstadoFpe(null).estado).toEqual(estadoFpeVazio());
  });

  it('lê de volta o que gravou (ida e volta)', () => {
    const s = falso();
    const estado = editarCampo(estadoFpeVazio(), 'ficha_02_02_1', PADRAO, 'why', 'Meu porquê', AGORA);
    expect(gravarEstadoFpe(estado, s)).toBe(true);
    const r = lerEstadoFpe(s);
    expect(r.origem).toBe('armazenamento');
    expect(r.estado).toEqual(estado);
    expect(s.dados.get(CHAVE_FPE)).toContain('"origem":"manual"');
  });

  it.each([
    ['JSON quebrado', '{não é json'],
    ['versão de esquema desconhecida', JSON.stringify({ schema_versao: 99, fpe_edicoes: {} })],
    ['edição sem origem manual', JSON.stringify({ schema_versao: 1, fpe_edicoes: { x: { campos: { what: 'a' }, origem: 'documentado', atualizado_em: AGORA } } })],
    ['campo com tipo errado', JSON.stringify({ schema_versao: 1, fpe_edicoes: { x: { campos: { what: 42 }, origem: 'manual', atualizado_em: AGORA } } })],
    ['formato totalmente diferente', JSON.stringify([1, 2, 3])],
  ])('%s: volta ao vazio (origem "corrompido") e guarda uma cópia do texto ilegível', (_nome, bruto) => {
    const s = falso();
    s.dados.set(CHAVE_FPE, bruto);
    const r = lerEstadoFpe(s);
    expect(r.origem).toBe('corrompido');
    expect(r.estado).toEqual(estadoFpeVazio());
    expect(s.dados.get(CHAVE_FPE_INVALIDO)).toBe(bruto); // nada é apagado em silêncio
  });

  it('corrompido e sem espaço para a cópia: ainda assim não lança', () => {
    const s = falso({ setLanca: true });
    s.dados.set(CHAVE_FPE, '{quebrado');
    expect(() => lerEstadoFpe(s)).not.toThrow();
    expect(lerEstadoFpe(s).origem).toBe('corrompido');
  });

  it('descarta campos desconhecidos e mantém os válidos', () => {
    const s = falso();
    s.dados.set(CHAVE_FPE, JSON.stringify({ schema_versao: 1, fpe_edicoes: { x: { campos: { what: 'a', inventado: 'b' }, origem: 'manual', atualizado_em: AGORA } } }));
    const r = lerEstadoFpe(s);
    expect(r.origem).toBe('armazenamento');
    expect(r.estado.fpe_edicoes.x?.campos).toEqual({ what: 'a' });
  });
});

describe('gravação', () => {
  it('devolve false (sem lançar) quando não há storage ou o navegador recusa (cota cheia)', () => {
    const estado = estadoFpeVazio();
    expect(gravarEstadoFpe(estado, null)).toBe(false);
    expect(gravarEstadoFpe(estado, falso({ setLanca: true }))).toBe(false);
    expect(gravarEstadoFpe(estado, falso())).toBe(true);
  });
});

describe('storage do navegador (jsdom)', () => {
  beforeEach(() => window.localStorage.clear());

  it('armazenamentoDoNavegador devolve o localStorage e a ida e volta funciona nele', () => {
    const s = armazenamentoDoNavegador();
    expect(s).not.toBeNull();
    const estado = editarCampo(estadoFpeVazio(), 'f1', PADRAO, 'who', 'Vendas', AGORA);
    expect(gravarEstadoFpe(estado)).toBe(true);
    expect(window.localStorage.getItem(CHAVE_FPE)).not.toBeNull();
    expect(lerEstadoFpe().estado).toEqual(estado);
  });
});

describe('edição de campos (imutável)', () => {
  it('marca origem "manual", guarda só o campo que difere e não altera o estado anterior', () => {
    const antes = estadoFpeVazio();
    const depois = editarCampo(antes, 'f1', PADRAO, 'what', 'Aborda o lead pelo WhatsApp', AGORA);
    expect(antes).toEqual(estadoFpeVazio());
    expect(depois.fpe_edicoes.f1).toEqual({ campos: { what: 'Aborda o lead pelo WhatsApp' }, origem: 'manual', atualizado_em: AGORA });
  });

  it('editar de novo o mesmo campo substitui; editar outro campo acumula', () => {
    let e = editarCampo(estadoFpeVazio(), 'f1', PADRAO, 'what', 'A', AGORA);
    e = editarCampo(e, 'f1', PADRAO, 'what', 'B', AGORA);
    e = editarCampo(e, 'f1', PADRAO, 'why', 'C', AGORA);
    expect(e.fpe_edicoes.f1?.campos).toEqual({ what: 'B', why: 'C' });
  });

  it('voltar o campo ao valor padrão desfaz a edição; sem campos diferentes a ficha deixa de ser editada', () => {
    let e = editarCampo(estadoFpeVazio(), 'f1', PADRAO, 'what', 'Outra coisa', AGORA);
    e = editarCampo(e, 'f1', PADRAO, 'why', 'Outro porquê', AGORA);
    e = editarCampo(e, 'f1', PADRAO, 'what', PADRAO.what, AGORA);
    expect(e.fpe_edicoes.f1?.campos).toEqual({ why: 'Outro porquê' });
    e = editarCampo(e, 'f1', PADRAO, 'why', PADRAO.why, AGORA);
    expect(e.fpe_edicoes).toEqual({});
  });

  it('esvaziar um campo é uma edição válida (a tela avisa; o dado não se perde)', () => {
    const e = editarCampo(estadoFpeVazio(), 'f1', PADRAO, 'how', '', AGORA);
    expect(e.fpe_edicoes.f1?.campos).toEqual({ how: '' });
  });

  it('edições de fichas diferentes não se misturam', () => {
    let e = editarCampo(estadoFpeVazio(), 'f1', PADRAO, 'what', 'um', AGORA);
    e = editarCampo(e, 'f2', PADRAO, 'what', 'dois', AGORA);
    expect(Object.keys(e.fpe_edicoes).sort()).toEqual(['f1', 'f2']);
    expect(e.fpe_edicoes.f1?.campos.what).toBe('um');
    expect(e.fpe_edicoes.f2?.campos.what).toBe('dois');
  });
});

describe('restaurar padrão e valores em vigor', () => {
  it('restaurarFicha remove todas as edições da ficha e não mexe nas outras', () => {
    let e: EstadoFpe = editarCampo(estadoFpeVazio(), 'f1', PADRAO, 'what', 'um', AGORA);
    e = editarCampo(e, 'f1', PADRAO, 'why', 'dois', AGORA);
    e = editarCampo(e, 'f2', PADRAO, 'what', 'tres', AGORA);
    const r = restaurarFicha(e, 'f1');
    expect(Object.keys(r.fpe_edicoes)).toEqual(['f2']);
    expect(restaurarFicha(r, 'inexistente')).toBe(r); // sem mudança, mesma referência
  });

  it('valoresEfetivos põe as edições por cima do padrão, campo a campo', () => {
    const e = editarCampo(estadoFpeVazio(), 'f1', PADRAO, 'who', 'CEO', AGORA);
    const v = valoresEfetivos(PADRAO, e.fpe_edicoes.f1);
    expect(v.who).toBe('CEO');
    expect(v.what).toBe(PADRAO.what);
    expect(Object.keys(v).sort()).toEqual([...CAMPOS_FICHA].sort());
    expect(valoresEfetivos(PADRAO)).toEqual(PADRAO);
  });
});
