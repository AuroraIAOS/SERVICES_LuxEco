// @vitest-environment node
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AnotacoesV08 } from '../../scripts/compor_v08.ts';
import { JSON_ANOTACOES, JSON_V08 } from '../../scripts/compor_v08.ts';
import type { Autoria, DocumentoFichas } from '../../scripts/gerar_fichas.ts';
import { gerarFichas, JSON_AUTORIA, JSON_FICHAS, resolverFonte, serializarFichas } from '../../scripts/gerar_fichas.ts';
import { validarFichas } from '../../scripts/validar_dados.ts';
import type { MatrizV08 } from './tipos.ts';
import { faseDoEstagio } from './tipos.ts';

const ler = <T,>(caminho: string): T => JSON.parse(readFileSync(caminho, 'utf8')) as T;
const clone = <T,>(x: T): T => structuredClone(x);

let v08: MatrizV08;
let autoria: Autoria;
let overlay: AnotacoesV08;
let doc: DocumentoFichas;

beforeAll(() => {
  v08 = ler<MatrizV08>(JSON_V08);
  autoria = ler<Autoria>(JSON_AUTORIA);
  overlay = ler<AnotacoesV08>(JSON_ANOTACOES);
  doc = gerarFichas(v08, autoria, overlay);
});

const fasesAutoradas = () => autoria.meta.fases_autoradas;
const acoesDasFases = (fases: number[]) => v08.acoes.filter((a) => fases.includes(faseDoEstagio(a.estagio_id)));
const erros = (d: DocumentoFichas = doc, fase?: number) => validarFichas(v08, d, autoria, fase, gerarFichas(v08, autoria, overlay));

describe('Fichas 5W1H das fases autoradas', () => {
  it('há exatamente uma ficha por ação das fases autoradas, sem órfãs e sem duplicadas', () => {
    const acoes = acoesDasFases(fasesAutoradas());
    expect(doc.fichas).toHaveLength(acoes.length);
    expect(doc.fichas.map((f) => f.acao_id)).toEqual(acoes.map((a) => a.id));
    expect(new Set(doc.fichas.map((f) => f.id)).size).toBe(doc.fichas.length);
    expect(doc.meta.total).toBe(doc.fichas.length);
  });

  it('a fase 1 (Est. 01–09) tem uma ficha por ação e passa na validação', () => {
    expect(fasesAutoradas()).toContain(1);
    const fase1 = v08.acoes.filter((a) => faseDoEstagio(a.estagio_id) === 1);
    expect(fase1.length).toBeGreaterThan(0);
    expect(fase1.every((a) => doc.fichas.some((f) => f.acao_id === a.id))).toBe(true);
    expect(erros(doc, 1)).toEqual([]);
  });

  it('nenhum campo 5W1H fica vazio e `what` é o texto da ação, sem reescrever', () => {
    const porId = new Map(v08.acoes.map((a) => [a.id, a]));
    for (const f of doc.fichas) {
      for (const campo of ['what', 'why', 'where', 'when', 'who', 'how'] as const) expect(f[campo].trim(), `${f.id}.${campo}`).not.toBe('');
      expect(f.what).toBe(porId.get(f.acao_id)?.texto);
      expect(f.setor_id).toBe(porId.get(f.acao_id)?.setor_id);
      expect(f.estagio_id).toBe(porId.get(f.acao_id)?.estagio_id);
    }
  });

  it('`who` é função/setor ou equipe nomeada na Matriz — nunca pessoa interna da Lux', () => {
    const catalogo = new Set(Object.values(autoria.setores).map((s) => s.who));
    for (const f of doc.fichas) expect(catalogo.has(f.who), f.id).toBe(true);
    expect(JSON.stringify(doc.fichas)).not.toMatch(/\bLuan\b/);
  });

  it('nenhuma ficha traz cifra em R$ nem prazo numérico (SLA) que os documentos não tragam', () => {
    for (const f of doc.fichas) {
      const texto = [f.why, f.where, f.when, f.how].join(' | ');
      expect(texto, f.id).not.toMatch(/R\$/);
      expect(texto, f.id).not.toMatch(/\b\d+\s*(?:dias?|horas?|minutos?|semanas?|meses|mês)\b/i);
    }
  });

  it('as ações IF/ELSE ganham as duas condicionais no “como” (rótulo e consequência de cada ramo)', () => {
    for (const c of v08.condicionais) {
      const f = doc.fichas.find((x) => x.acao_id === c.acao_id);
      if (!f) continue; // fase ainda não autorada
      expect(f.how, f.id).toContain(`se “${c.se_sim.rotulo}”, ${c.se_sim.texto}`);
      expect(f.how, f.id).toContain(`se “${c.se_nao.rotulo}”, ${c.se_nao.texto}`);
    }
  });

  it('as ações do Grupo de Fluxo apontam o WhatsApp como local; antes do Est. 07 ele não é o canal', () => {
    for (const a of v08.acoes.filter((x) => x.canal === 'whatsapp_grupo_fluxo')) {
      const f = doc.fichas.find((x) => x.acao_id === a.id);
      if (f) expect(f.where).toContain('Grupo de Fluxo no WhatsApp');
    }
    const antes = doc.fichas.filter((f) => f.estagio_id < 7 && f.setor_id === 'setor_02');
    expect(antes.length).toBeGreaterThan(0);
    expect(antes.every((f) => !f.where.startsWith('Grupo de Fluxo no WhatsApp'))).toBe(true);
  });

  it('a “when” traz o estágio e o gatilho; a “where” vem de local documentado ou de rotina interna do setor', () => {
    for (const f of doc.fichas) {
      const est = v08.estagios.find((e) => e.id === f.estagio_id)!;
      expect(f.when.startsWith(`Est. ${String(est.numero).padStart(2, '0')} — ${est.nome}: `), f.id).toBe(true);
    }
  });

  it('rastreia a fonte de cada ficha: célula da Matriz (V07) ou seção das Anotações (V08) + estágio e setor no Relatório', () => {
    const idsV07 = new Set(v08.acoes.filter((a) => !a.origem_doc).map((a) => a.id));
    for (const f of doc.fichas) {
      const primeira = f.fontes[0]!;
      if (idsV07.has(f.acao_id)) expect(primeira.arquivo, f.id).toContain('Matriz_Operacional.xlsx');
      else expect(primeira.arquivo, f.id).toContain('Anotacoes_CEO');
      expect(f.fontes.some((x) => x.arquivo.includes('Relatorio_Operacional_V07.md') && x.trecho.startsWith('§3 Est.'))).toBe(true);
      expect(f.fontes.some((x) => x.arquivo.includes('Relatorio_Operacional_V07.md') && x.trecho.startsWith('§2 Setor'))).toBe(true);
    }
  });

  it('marca `sugerido` só onde a autoria assume, e sem selo no texto (origem fica só no JSON)', () => {
    const sugeridos = doc.fichas.filter((f) => f.origem === 'sugerido').map((f) => f.acao_id).sort();
    const esperados = [...Object.entries(autoria.fichas).filter(([, c]) => c.origem === 'sugerido').map(([id]) => id), ...v08.acoes.filter((a) => autoria.modelos[a.texto]?.origem === 'sugerido' && doc.fichas.some((f) => f.acao_id === a.id)).map((a) => a.id)].sort();
    expect(sugeridos).toEqual(esperados);
    for (const f of doc.fichas) expect(`${f.why} ${f.how}`, f.id).not.toMatch(/sugerid|documentad/i);
  });

  it('é determinística e o data/conteudo/fichas_5w1h.json versionado está em dia com a autoria', () => {
    expect(serializarFichas(gerarFichas(v08, autoria, overlay))).toBe(serializarFichas(doc));
    expect(readFileSync(JSON_FICHAS, 'utf8').replace(/\r\n/g, '\n')).toBe(serializarFichas(doc));
  });
});

describe('validarFichas detecta erro (sensibilidade)', () => {
  it('campo 5W1H vazio', () => {
    const d = clone(doc);
    d.fichas[0]!.why = '  ';
    expect(erros(d).some((e) => e.includes('campo why vazio'))).toBe(true);
  });

  it('what reescrito', () => {
    const d = clone(doc);
    d.fichas[0]!.what += ' (reescrito)';
    expect(erros(d).some((e) => e.includes('what difere'))).toBe(true);
  });

  it('who com pessoa interna ou nome que não é função/setor', () => {
    const a = clone(doc);
    a.fichas[0]!.who = 'Luan';
    expect(erros(a).some((e) => e.includes('Luan'))).toBe(true);
    const b = clone(doc);
    b.fichas[0]!.who = 'Vendas (Maria)';
    expect(erros(b).some((e) => e.includes('Maria'))).toBe(true);
  });

  it('cifra em R$ e prazo numérico', () => {
    const a = clone(doc);
    a.fichas[0]!.how += ' Custa R$ 100.';
    expect(erros(a).some((e) => e.includes('cifra em R$'))).toBe(true);
    const b = clone(doc);
    b.fichas[0]!.when += ' em 48 horas';
    expect(erros(b).some((e) => e.includes('prazo numérico'))).toBe(true);
  });

  it('ficha órfã, duplicada e ação sem ficha', () => {
    const orfa = clone(doc);
    orfa.fichas[0]!.acao_id = 'acao_99_99_1';
    expect(erros(orfa).some((e) => e.includes('órfã'))).toBe(true);
    const dup = clone(doc);
    dup.fichas.push(clone(dup.fichas[0]!));
    expect(erros(dup).some((e) => e.includes('duplicad') || e.includes('mais de uma ficha'))).toBe(true);
    const falta = clone(doc);
    falta.fichas.pop();
    expect(erros(falta, 1).some((e) => e.includes('sem ficha'))).toBe(true);
  });

  it('fonte sem trecho ou de arquivo inexistente; origem e data inválidas', () => {
    const a = clone(doc);
    a.fichas[0]!.fontes[0]!.trecho = '';
    expect(erros(a).some((e) => e.includes('sem arquivo ou trecho'))).toBe(true);
    const b = clone(doc);
    b.fichas[0]!.fontes[0]!.arquivo = 'data/fontes/nao_existe.md';
    expect(erros(b).some((e) => e.includes('não existe'))).toBe(true);
    const c = clone(doc);
    (c.fichas[0] as { origem: string }).origem = 'inventado';
    expect(erros(c).some((e) => e.includes('origem inválida'))).toBe(true);
    const d = clone(doc);
    d.fichas[0]!.atualizado_em = '24/09/2026';
    expect(erros(d).some((e) => e.includes('atualizado_em'))).toBe(true);
  });

  it('arquivo desatualizado em relação à autoria', () => {
    const d = clone(doc);
    d.fichas[0]!.how += ' (editado à mão)';
    expect(erros(d).some((e) => e.includes('desatualizado'))).toBe(true);
  });

  it('fase ainda não autorada', () => {
    const fase = [1, 2, 3, 4].find((f) => !fasesAutoradas().includes(f));
    if (fase === undefined) return; // todas autoradas (fim da 02.5)
    expect(erros(doc, fase).some((e) => e.includes('ainda não foi autorada'))).toBe(true);
  });
});

describe('gerarFichas recusa autoria incompleta ou incoerente', () => {
  const base = () => clone(autoria);

  it('ação sem autoria (nem ficha própria, nem modelo)', () => {
    const a = base();
    const alvo = Object.keys(a.fichas)[0]!;
    delete a.fichas[alvo];
    expect(() => gerarFichas(v08, a, overlay)).toThrow(new RegExp(`${alvo}: sem autoria`));
  });

  it('autoria para ação que não existe ou está fora das fases autoradas', () => {
    const a = base();
    a.fichas.acao_99_99_1 = { why: 'x', how: 'y' };
    expect(() => gerarFichas(v08, a, overlay)).toThrow(/acao_99_99_1/);
  });

  it('ficha própria e modelo para a mesma ação', () => {
    const a = base();
    const alvo = v08.acoes.find((x) => autoria.modelos[x.texto] && faseDoEstagio(x.estagio_id) === 1)!;
    a.fichas[alvo.id] = { why: 'x', how: 'y' };
    expect(() => gerarFichas(v08, a, overlay)).toThrow(/escolha um/);
  });

  it('modelo que nenhuma ação usa', () => {
    const a = base();
    a.modelos['Texto que não existe na Matriz'] = { why: 'x', how: 'y' };
    expect(() => gerarFichas(v08, a, overlay)).toThrow(/nenhuma ação/);
  });

  it('atalho de fonte desconhecido', () => {
    expect(() => resolverFonte('zzz:algo')).toThrow(/desconhecido/);
    expect(() => resolverFonte('mapa')).toThrow(/trecho/);
    expect(resolverFonte('mapa:Est. 07')).toEqual({ arquivo: 'data/fontes/Mapa_Organizacional.md', trecho: 'Est. 07' });
  });
});
