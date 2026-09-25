// @vitest-environment node
// Exportações do FPE (02.10): JSON (ida e volta), Markdown, Mermaid, nomes de arquivo e contraste do fluxograma nos dois temas.
import { describe, expect, it } from 'vitest';
import tokens from '../../design/tokens.json' with { type: 'json' };
import { DOCUMENTO_FICHAS } from '../dados/fichas';
import { MATRIZ_V08 } from '../dados/matriz';
import type { EstadoFpe } from '../estado/armazenamento';
import { editarCampo, estadoFpeVazio, valoresEfetivos } from '../estado/armazenamento';
import { contraste, corLegivel, misturar } from '../fluxograma/cor';
import { raiasFase, raiasSetor } from '../fluxograma/raias';
import { matrizComEdicoes, montarFpe, valoresPadrao } from '../telas/fpe/modelo';
import { NOTA_PROPRIEDADE } from '../ui/identidade';
import { dataLocal, nomeArquivo, slug } from './baixar';
import { montarDocumentoFichas } from './documento';
import { exportarJson, FORMATO_JSON, FORMATO_VERSAO, importarJson } from './json';
import { renderizarMd } from './md';
import { exportarMermaidFase, exportarMermaidSetor } from './mermaid';

const AGORA = new Date(2026, 8, 25, 14, 30); // 25/09/2026, horário local
const fichas = DOCUMENTO_FICHAS.fichas;
const ficha = (i: number) => fichas[i]!;

/** Estado com edições variadas: texto novo, campo vazio, várias linhas e acentos. */
function estadoEditado(): EstadoFpe {
  let e = estadoFpeVazio();
  const editar = (i: number, campo: 'what' | 'why' | 'how' | 'who', valor: string, quando: string) => {
    e = editarCampo(e, ficha(i).id, valoresPadrao(ficha(i)), campo, valor, quando);
  };
  editar(0, 'what', 'Aborda o lead pelo WhatsApp em minutos', '2026-09-25T10:00:00.000Z');
  editar(0, 'why', '', '2026-09-25T10:01:00.000Z');
  editar(40, 'how', 'Passo 1: confirmar o cadastro\nPasso 2: registrar no CRM\n\nPasso 3: avisar o setor — ação “final”', '2026-09-25T11:00:00.000Z');
  editar(200, 'who', 'Coordenação comercial', '2026-09-25T12:00:00.000Z');
  return e;
}

describe('nome de arquivo', () => {
  it('fpe_<setor|geral>_<AAAA-MM-DD>.<ext>, sem acento nem espaço', () => {
    expect(nomeArquivo('Vendas', 'md', AGORA)).toBe('fpe_vendas_2026-09-25.md');
    expect(nomeArquivo('Equipe Técnica', 'mermaid', AGORA)).toBe('fpe_equipe-tecnica_2026-09-25.mermaid');
    expect(nomeArquivo('geral', 'json', AGORA)).toBe('fpe_geral_2026-09-25.json');
    expect(nomeArquivo('geral-fase2', 'pdf', AGORA)).toBe('fpe_geral-fase2_2026-09-25.pdf');
  });
  it('todo setor da Matriz gera um nome válido (só a-z, 0-9 e hífen no escopo)', () => {
    for (const s of MATRIZ_V08.setores) expect(nomeArquivo(s.nome, 'md', AGORA)).toMatch(/^fpe_[a-z0-9-]+_\d{4}-\d{2}-\d{2}\.md$/);
  });
  it('usa o dia local, com zero à esquerda', () => {
    expect(dataLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(slug('  Cemig / Distribuidora  ')).toBe('cemig-distribuidora');
  });
});

describe('JSON — carimbo e ida e volta', () => {
  it('leva o carimbo: formato, versão, data, versão da Matriz, resumo e o estado', () => {
    const saida = JSON.parse(exportarJson(estadoEditado(), DOCUMENTO_FICHAS, AGORA));
    expect(saida.formato).toBe(FORMATO_JSON);
    expect(saida.formato_versao).toBe(FORMATO_VERSAO);
    expect(saida.exportado_em).toBe(AGORA.toISOString());
    expect(saida.versao_matriz).toBe(DOCUMENTO_FICHAS.meta.versao_matriz);
    expect(saida.resumo).toEqual({ fichas_total: 236, fichas_editadas: 3 });
    expect(saida.estado.schema_versao).toBe(1);
  });

  it('exportar → importar devolve um estado IDÊNTICO (inclui vazio, várias linhas, acentos e datas)', () => {
    const antes = estadoEditado();
    const r = importarJson(exportarJson(antes, DOCUMENTO_FICHAS, AGORA), DOCUMENTO_FICHAS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estado).toEqual(antes);
    expect(r.ignoradas).toEqual([]);
    expect(r.exportadoEm).toBe(AGORA.toISOString());
    // e o segundo ciclo não muda nada
    expect(importarJson(exportarJson(r.estado, DOCUMENTO_FICHAS, AGORA), DOCUMENTO_FICHAS)).toEqual(r);
  });

  it('estado vazio também faz a viagem', () => {
    const r = importarJson(exportarJson(estadoFpeVazio(), DOCUMENTO_FICHAS, AGORA), DOCUMENTO_FICHAS);
    expect(r.ok && r.estado).toEqual(estadoFpeVazio());
  });

  it('ficha que a ferramenta não tem mais é ignorada e avisada, sem derrubar o resto', () => {
    const arquivo = JSON.parse(exportarJson(estadoEditado(), DOCUMENTO_FICHAS, AGORA));
    arquivo.estado.fpe_edicoes['ficha_fantasma_99_1'] = { campos: { what: 'x' }, origem: 'manual', atualizado_em: 'y' };
    const r = importarJson(JSON.stringify(arquivo), DOCUMENTO_FICHAS);
    expect(r.ok && r.ignoradas).toEqual(['ficha_fantasma_99_1']);
    expect(r.ok && Object.keys(r.estado.fpe_edicoes)).toHaveLength(3);
  });

  it.each([
    ['não é JSON', 'isto não é json', /JSON válido/],
    ['JSON de outra coisa', JSON.stringify({ a: 1 }), /não é uma exportação do FPE/],
    ['JSON que não é objeto', '42', /não é uma exportação do FPE/],
    ['versão de formato mais nova', JSON.stringify({ formato: FORMATO_JSON, formato_versao: 99, estado: estadoFpeVazio() }), /versão mais nova/],
    ['estado com campo fora do formato', JSON.stringify({ formato: FORMATO_JSON, formato_versao: 1, estado: { schema_versao: 1, fpe_edicoes: { x: { campos: { what: 3 }, origem: 'manual', atualizado_em: 'y' } } } }), /fora do formato/],
    ['estado sem edições', JSON.stringify({ formato: FORMATO_JSON, formato_versao: 1 }), /fora do formato/],
    ['origem que não é manual', JSON.stringify({ formato: FORMATO_JSON, formato_versao: 1, estado: { schema_versao: 1, fpe_edicoes: { x: { campos: {}, origem: 'sugerido', atualizado_em: 'y' } } } }), /fora do formato/],
  ])('recusa %s', (_nome, texto, mensagem) => {
    const r = importarJson(texto, DOCUMENTO_FICHAS);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro).toMatch(mensagem);
  });
});

describe('Markdown — legível por setor e geral', () => {
  const estado = estadoEditado();
  const fpe = montarFpe(MATRIZ_V08, DOCUMENTO_FICHAS, estado);
  const setorDoc = (nome: string) => MATRIZ_V08.setores.find((s) => s.nome === nome)!;

  it('setor: título, nota de propriedade, fase → estágio → ficha, com todos os campos 5W1H', () => {
    const vendas = setorDoc('Vendas');
    const md = renderizarMd(montarDocumentoFichas(fpe, MATRIZ_V08, vendas.id), '25/09/2026');
    expect(md.startsWith('# FPE — fichas 5W1H do setor Vendas\n')).toBe(true);
    expect(md).toContain('25/09/2026');
    expect(md).toContain(`> ${NOTA_PROPRIEDADE}`);
    const n = fichas.filter((f) => f.setor_id === vendas.id).length;
    expect((md.match(/^#### /gm) ?? []).length).toBe(n);
    for (const rotulo of ['O quê', 'Por quê', 'Onde', 'Quando', 'Quem', 'Como']) expect((md.match(new RegExp(`^- \\*\\*${rotulo}:\\*\\* `, 'gm')) ?? []).length).toBe(n);
    expect(md).toMatch(/^## Fase 1 — /m);
    expect(md).toMatch(/^### Estágio 02 — Atendimento$/m);
  });

  it('usa os valores EM VIGOR: mostra a edição, não o texto original; campo vazio vira travessão', () => {
    const f0 = ficha(0);
    const md = renderizarMd(montarDocumentoFichas(fpe, MATRIZ_V08, f0.setor_id), '25/09/2026');
    expect(md).toContain('Aborda o lead pelo WhatsApp em minutos');
    expect(md).not.toContain(`**O quê:** ${f0.what}\n`);
    expect(md).toContain('- **Por quê:** —');
  });

  it('“Como” de várias linhas continua dentro do item (linhas seguintes recuadas)', () => {
    const f = ficha(40);
    const md = renderizarMd(montarDocumentoFichas(fpe, MATRIZ_V08, f.setor_id), '25/09/2026');
    expect(md).toContain('- **Como:** Passo 1: confirmar o cadastro\n  Passo 2: registrar no CRM\n\n  Passo 3: avisar o setor — ação “final”');
  });

  it('marca decisões IF/ELSE e não traz selo de proveniência', () => {
    const md = renderizarMd(montarDocumentoFichas(fpe, MATRIZ_V08), '25/09/2026');
    expect(md).toContain('(IF/ELSE)');
    expect(md).not.toMatch(/origem|sugerido|manual|Editada/i);
  });

  it('geral: as 236 fichas, um título por setor, um nível abaixo', () => {
    const md = renderizarMd(montarDocumentoFichas(fpe, MATRIZ_V08), '25/09/2026');
    expect(md.startsWith('# FPE — fichas 5W1H de todos os setores\n')).toBe(true);
    expect((md.match(/^##### /gm) ?? []).length).toBe(236);
    expect((md.match(/^## Setor /gm) ?? []).length).toBe(12);
    expect(md).toContain(NOTA_PROPRIEDADE);
  });

  it('nenhuma linha do documento começa com “#” fora da estrutura (texto digitado não vira título)', () => {
    let e = estadoFpeVazio();
    e = editarCampo(e, ficha(1).id, valoresPadrao(ficha(1)), 'how', 'Primeira linha\n# Título falso\n- item', 'x');
    const md = renderizarMd(montarDocumentoFichas(montarFpe(MATRIZ_V08, DOCUMENTO_FICHAS, e), MATRIZ_V08, ficha(1).setor_id), 'x');
    expect(md).toContain('\n  # Título falso');
    expect(md).not.toMatch(/^# Título falso/m);
  });

  it('setor inexistente falha alto (não gera arquivo vazio)', () => {
    expect(() => montarDocumentoFichas(fpe, MATRIZ_V08, 'setor_99')).toThrow(/sem fichas/);
  });
});

describe('Mermaid — por setor e por fase, com as edições', () => {
  const efetiva = matrizComEdicoes(MATRIZ_V08, DOCUMENTO_FICHAS, estadoEditado());

  it('setor: cabeçalho de comentários, flowchart LR e o texto editado', () => {
    const setor = MATRIZ_V08.setores.find((s) => s.id === ficha(0).setor_id)!;
    const m = exportarMermaidSetor(efetiva, setor.id, AGORA);
    const linhas = m.split('\n');
    expect(linhas.slice(0, 3).every((l) => l.startsWith('%% '))).toBe(true);
    expect(linhas[0]).toContain('Fluxo do setor ' + setor.nome);
    expect(linhas[1]).toContain('exportado em 2026-09-25');
    expect(linhas[2]).toContain(NOTA_PROPRIEDADE.replace(/[{}]/g, ''));
    expect(linhas[3]).toBe('flowchart LR');
    expect(m).toContain('Aborda o lead pelo WhatsApp em minutos');
    expect(m.endsWith('\n')).toBe(true);
  });

  it('nenhum comentário abre uma diretiva (%%{) e todo setor e toda fase exportam', () => {
    for (const s of MATRIZ_V08.setores) expect(exportarMermaidSetor(efetiva, s.id, AGORA)).not.toMatch(/%%\{/);
    for (const f of MATRIZ_V08.fases) {
      const m = exportarMermaidFase(efetiva, f.id, AGORA);
      expect(m).toContain(`Fase ${f.id}`);
      expect(m).toContain('flowchart LR');
    }
  });

  it('setor ou fase inexistente falha alto', () => {
    expect(() => exportarMermaidSetor(efetiva, 'setor_99', AGORA)).toThrow(/inexistente/);
    expect(() => exportarMermaidFase(efetiva, 9, AGORA)).toThrow(/inexistente/);
  });
});

describe('valores em vigor', () => {
  it('o documento usa exatamente valoresEfetivos (padrão + edição)', () => {
    const e = estadoEditado();
    const f = ficha(0);
    expect(valoresEfetivos(valoresPadrao(f), e.fpe_edicoes[f.id]).what).toBe('Aborda o lead pelo WhatsApp em minutos');
  });
});

// ── Contraste AA (WCAG 2.1) do fluxograma nos dois temas ───────────────────────────────────────────────
describe('contraste do fluxograma — AA nos dois temas', () => {
  const c = tokens.cores;
  const temas = {
    escuro: { fundo: c.chumbo, cartao: c['chumbo-mid'] },
    claro: { fundo: c.branco, cartao: c.branco },
  } as const;

  it('os tons originais verde e vermelho reprovam em pelo menos um tema (por isso o ajuste)', () => {
    const reprovados = [c.sucesso, c.erro, c.whatsapp].filter((cor) => contraste(cor, c['chumbo-mid']) < 4.5 || contraste(cor, c.branco) < 4.5);
    expect(reprovados.length).toBe(3);
  });

  it('corLegivel devolve a própria cor quando já passa e nunca piora o contraste', () => {
    expect(corLegivel(c.branco, c.chumbo, c.branco)).toBe(c.branco);
    for (const cor of Object.values(tokens.setores)) {
      for (const [fundo, polo] of [
        [c['chumbo-mid'], c.branco],
        [c.branco, c.chumbo],
      ] as const) {
        expect(contraste(corLegivel(cor, fundo, polo), fundo)).toBeGreaterThanOrEqual(Math.min(4.5, contraste(cor, fundo)));
        expect(contraste(corLegivel(cor, fundo, polo), fundo)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  for (const [tema, { fundo, cartao }] of Object.entries(temas) as [keyof typeof temas, (typeof temas)[keyof typeof temas]][]) {
    const svgs = () => [...MATRIZ_V08.setores.map((s) => raiasSetor(MATRIZ_V08, s.id, { tema })), ...MATRIZ_V08.fases.map((f) => raiasFase(MATRIZ_V08, f.id, { tema }))];

    it(`tema ${tema}: todo texto do SVG tem ≥ 4,5:1 sobre o fundo; o do cartão, também sobre o cartão`, () => {
      let vistos = 0;
      for (const svg of svgs()) {
        for (const m of svg.matchAll(/<text([^>]*) fill="(#[0-9A-F]{6})"/g)) {
          vistos++;
          expect(contraste(m[2]!, fundo), `${m[2]} sobre o fundo`).toBeGreaterThanOrEqual(4.5);
          // o nome do setor (font-size 13) fica na faixa da raia, não no cartão: tem teste próprio abaixo
          if (!m[1]!.includes('font-size="13"')) expect(contraste(m[2]!, cartao), `${m[2]} sobre o cartão`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(vistos).toBeGreaterThan(1000);
    });

    it(`tema ${tema}: o nome do setor na raia passa AA sobre a faixa da própria raia`, () => {
      let rotulos = 0;
      for (const f of MATRIZ_V08.fases) {
        const svg = raiasFase(MATRIZ_V08, f.id, { tema });
        let faixa = fundo;
        for (const m of svg.matchAll(/<rect[^>]* fill="(#[0-9A-F]{6})" fill-opacity="0\.06"|<text[^>]* font-size="13" font-weight="800" fill="(#[0-9A-F]{6})"/g)) {
          if (m[1]) faixa = misturar(m[1], fundo, 0.06);
          else {
            rotulos++;
            expect(contraste(m[2]!, faixa), `${m[2]} sobre ${faixa}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
      expect(rotulos).toBeGreaterThanOrEqual(12);
    });

    it(`tema ${tema}: o losango IF/ELSE tem contorno (o amarelo sozinho não passa 3:1 sobre branco)`, () => {
      const svg = raiasSetor(MATRIZ_V08, MATRIZ_V08.setores.find((s) => s.nome === 'Vendas')!.id, { tema });
      const losangos = svg.match(/<polygon [^>]*>/g) ?? [];
      expect(losangos.length).toBeGreaterThan(0);
      for (const l of losangos) expect(l).toMatch(/stroke="#[0-9A-F]{6}"/);
    });
  }
});
