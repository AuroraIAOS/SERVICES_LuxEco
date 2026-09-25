// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Versao } from '../../backup/cliente';
import { alternarTodas, alternarUma, avisoDeLimite, estadoDaSelecao, filtrarEOrdenar, indiceJson, podarSelecao, separarProtegidas, tamanhoLegivel } from './modelo';

const v = (n: number, mudar: Partial<Versao> = {}): Versao => ({ id: `bk_20260925_10000${n}_a0b1c2d${n}`, rotulo: `Versão ${n}`, escopo: 'completo', criado_em: `2026-09-${10 + n}T10:00:00-03:00`, tamanho_bytes: 100, sha256: 'a'.repeat(64), versao_app: 'V08', protegido: false, ...mudar });

describe('filtrarEOrdenar', () => {
  const itens = [v(1, { rotulo: 'Reunião', escopo: 'fpe' }), v(2, { rotulo: 'Ação final', escopo: 'pop' }), v(3, { rotulo: 'Rascunho', escopo: 'fpe' })];

  it('ordena por data; em empate de data, pelo id (ordem estável)', () => {
    expect(filtrarEOrdenar(itens, { escopo: 'todos', busca: '', ordem: 'recentes' }).map((x) => x.rotulo)).toEqual(['Rascunho', 'Ação final', 'Reunião']);
    expect(filtrarEOrdenar(itens, { escopo: 'todos', busca: '', ordem: 'antigas' }).map((x) => x.rotulo)).toEqual(['Reunião', 'Ação final', 'Rascunho']);
    const iguais = [v(1, { criado_em: '2026-09-10T10:00:00-03:00' }), v(2, { criado_em: '2026-09-10T10:00:00-03:00' })];
    expect(filtrarEOrdenar(iguais, { escopo: 'todos', busca: '', ordem: 'recentes' }).map((x) => x.id)).toEqual([iguais[1]!.id, iguais[0]!.id]);
  });

  it('filtra por escopo e busca sem acento e sem diferenciar caixa; não altera a lista original', () => {
    const copia = [...itens];
    expect(filtrarEOrdenar(itens, { escopo: 'fpe', busca: '', ordem: 'recentes' })).toHaveLength(2);
    expect(filtrarEOrdenar(itens, { escopo: 'todos', busca: 'ACAO', ordem: 'recentes' }).map((x) => x.rotulo)).toEqual(['Ação final']);
    expect(filtrarEOrdenar(itens, { escopo: 'pop', busca: 'reuniao', ordem: 'recentes' })).toEqual([]);
    expect(filtrarEOrdenar(itens, { escopo: 'todos', busca: '   ', ordem: 'recentes' })).toHaveLength(3);
    expect(itens).toEqual(copia);
  });

  it('data ilegível vai para o fim das recentes sem quebrar', () => {
    expect(filtrarEOrdenar([v(1, { criado_em: 'ontem' }), v(2)], { escopo: 'todos', busca: '', ordem: 'recentes' }).map((x) => x.rotulo)).toEqual(['Versão 2', 'Versão 1']);
  });
});

describe('seleção', () => {
  const todas = [v(1), v(2), v(3)];

  it('nenhuma, algumas, todas — sobre o que está visível', () => {
    expect(estadoDaSelecao(todas, new Set())).toBe('nenhuma');
    expect(estadoDaSelecao(todas, new Set([todas[0]!.id]))).toBe('algumas');
    expect(estadoDaSelecao(todas, new Set(todas.map((x) => x.id)))).toBe('todas');
    expect(estadoDaSelecao([], new Set(['x']))).toBe('nenhuma');
    expect(estadoDaSelecao([todas[0]!], new Set([todas[0]!.id, 'fora']))).toBe('todas'); // a seleção de fora da vista não conta
  });

  it('alternarTodas marca as visíveis (ou desmarca só elas) sem tocar no que está fora da vista', () => {
    const marcada = alternarTodas([todas[0]!, todas[1]!], new Set(['fora']));
    expect([...marcada].sort()).toEqual(['fora', todas[0]!.id, todas[1]!.id].sort());
    const desmarcada = alternarTodas([todas[0]!, todas[1]!], marcada);
    expect([...desmarcada]).toEqual(['fora']);
    expect([...alternarTodas(todas, new Set([todas[0]!.id]))]).toHaveLength(3); // parcial → marca todas
  });

  it('alternarUma e podarSelecao são imutáveis', () => {
    const base = new Set(['a']);
    expect([...alternarUma(base, 'b')].sort()).toEqual(['a', 'b']);
    expect([...alternarUma(base, 'a')]).toEqual([]);
    expect([...base]).toEqual(['a']);
    expect([...podarSelecao(new Set([todas[0]!.id, 'sumiu']), todas)]).toEqual([todas[0]!.id]);
  });
});

describe('separarProtegidas', () => {
  it('as protegidas nunca entram na lista de exclusão', () => {
    const itens = [v(1), v(2, { protegido: true }), v(3)];
    const r = separarProtegidas(itens, new Set(itens.map((x) => x.id)));
    expect(r.excluir.map((x) => x.rotulo)).toEqual(['Versão 1', 'Versão 3']);
    expect(r.protegidas.map((x) => x.rotulo)).toEqual(['Versão 2']);
    expect(separarProtegidas(itens, new Set([itens[1]!.id])).excluir).toEqual([]);
    expect(separarProtegidas(itens, new Set(['inexistente']))).toEqual({ excluir: [], protegidas: [] });
  });
});

describe('contador de limite', () => {
  it('ok até 7, perto a partir de 8, cheio no limite', () => {
    expect(avisoDeLimite(0, 10)).toBe('ok');
    expect(avisoDeLimite(7, 10)).toBe('ok');
    expect(avisoDeLimite(8, 10)).toBe('perto');
    expect(avisoDeLimite(9, 10)).toBe('perto');
    expect(avisoDeLimite(10, 10)).toBe('cheio');
    expect(avisoDeLimite(2, 3)).toBe('perto'); // limite menor: avisa na última vaga
    expect(avisoDeLimite(3, 3)).toBe('cheio');
  });
});

describe('índice e tamanho', () => {
  it('o índice leva só metadados (nada de conteúdo) e é JSON válido', () => {
    const json = indiceJson([v(1)], 10, new Date(2026, 8, 25, 14, 30));
    const lido = JSON.parse(json) as { formato: string; total: number; limite: number; versoes: Record<string, unknown>[] };
    expect(lido).toMatchObject({ formato: 'lux_indice_versoes', total: 1, limite: 10 });
    expect(Object.keys(lido.versoes[0]!).sort()).toEqual(['criado_em', 'escopo', 'id', 'protegido', 'rotulo', 'sha256', 'tamanho_bytes', 'versao_app']);
    expect(json.endsWith('\n')).toBe(true);
  });

  it('tamanho legível', () => {
    expect(tamanhoLegivel(512)).toBe('512 B');
    expect(tamanhoLegivel(2048)).toBe('2 kB');
    expect(tamanhoLegivel(1536)).toBe('1,5 kB');
    expect(tamanhoLegivel(5 * 1024 * 1024)).toBe('5 MB');
  });
});
