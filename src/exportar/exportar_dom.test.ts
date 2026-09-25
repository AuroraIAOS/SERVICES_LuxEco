// Exportações que tocam o navegador (02.10): download, impressão (PDF) e o CSS de impressão. Ambiente jsdom.
import mermaid from 'mermaid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import impressaoCss from '../estilos/impressao.css?raw';
import { DOCUMENTO_FICHAS } from '../dados/fichas';
import { MATRIZ_V08 } from '../dados/matriz';
import { estadoFpeVazio } from '../estado/armazenamento';
import { matrizComEdicoes, montarFpe } from '../telas/fpe/modelo';
import { NOTA_PROPRIEDADE } from '../ui/identidade';
import { baixar } from './baixar';
import { montarDocumentoFichas } from './documento';
import { exportarMermaidFase, exportarMermaidSetor } from './mermaid';
import { escaparHtml, htmlFichas, htmlFluxo, ID_AREA_IMPRESSAO, imprimir } from './pdf';

describe('baixar()', () => {
  let blobs: Blob[];
  beforeEach(() => {
    blobs = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:lux';
    });
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('cria um link com o nome pedido, clica e o remove; o conteúdo vai como UTF-8', async () => {
    const cliques: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      cliques.push(`${this.download}|${this.href}`);
    });
    baixar('fpe_vendas_2026-09-25.md', '# Ação “final”\n', 'text/markdown');
    expect(cliques).toEqual(['fpe_vendas_2026-09-25.md|blob:lux']);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(blobs[0]!.type).toBe('text/markdown;charset=utf-8');
    expect(await blobs[0]!.text()).toBe('# Ação “final”\n');
  });
});

describe('imprimir() — PDF pela impressão do navegador', () => {
  let imprimiu: { area: HTMLElement | null; raiz: boolean; titulo: string }[];
  beforeEach(() => {
    imprimiu = [];
    window.print = vi.fn(() => {
      imprimiu.push({ area: document.getElementById(ID_AREA_IMPRESSAO), raiz: document.documentElement.classList.contains('imprimindo'), titulo: document.title });
    });
    document.title = 'FPE — Lux';
  });
  afterEach(() => {
    document.getElementById(ID_AREA_IMPRESSAO)?.remove();
    document.documentElement.classList.remove('imprimindo');
  });

  it('monta a área, marca a página como “imprimindo”, usa o nome sugerido no título e limpa no afterprint', () => {
    imprimir('<p>corpo</p>', 'a3', 'fpe_vendas_2026-09-25');
    expect(imprimiu).toHaveLength(1);
    expect(imprimiu[0]!.raiz).toBe(true);
    expect(imprimiu[0]!.titulo).toBe('fpe_vendas_2026-09-25');
    expect(imprimiu[0]!.area?.className).toBe('impressao impressao--fluxo');
    expect(imprimiu[0]!.area?.innerHTML).toBe('<p>corpo</p>');

    window.dispatchEvent(new Event('afterprint'));
    expect(document.getElementById(ID_AREA_IMPRESSAO)).toBeNull();
    expect(document.documentElement.classList.contains('imprimindo')).toBe(false);
    expect(document.title).toBe('FPE — Lux');
  });

  it('A4 usa a página de texto; uma segunda impressão troca a área anterior (nunca duas)', () => {
    imprimir('<p>um</p>', 'a4', 'a');
    imprimir('<p>dois</p>', 'a4', 'b');
    expect(document.querySelectorAll(`#${ID_AREA_IMPRESSAO}`)).toHaveLength(1);
    expect(imprimiu[1]!.area?.className).toBe('impressao impressao--texto');
    expect(imprimiu[1]!.area?.innerHTML).toBe('<p>dois</p>');
  });

  it('o HTML das fichas escapa o texto digitado (nada vira marcação) e traz a nota de propriedade', () => {
    const ficha = DOCUMENTO_FICHAS.fichas[0]!;
    const estado = { ...estadoFpeVazio(), fpe_edicoes: { [ficha.id]: { campos: { what: '<script>alert(1)</script> & "aspas"', how: 'linha 1\nlinha 2' }, origem: 'manual' as const, atualizado_em: 'x' } } };
    const html = htmlFichas(montarDocumentoFichas(montarFpe(MATRIZ_V08, DOCUMENTO_FICHAS, estado), MATRIZ_V08, ficha.setor_id), '25/09/2026');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;aspas&quot;');
    expect(html).toContain('linha 1<br>linha 2');
    expect(html).toContain(escaparHtml(NOTA_PROPRIEDADE));
    expect(html).toContain('25/09/2026');
    expect(html).not.toMatch(/origem|manual|Editada/i);
  });

  it('o HTML do fluxo leva o SVG como está (o gerador já escapa) e o título escapado', () => {
    const html = htmlFluxo('Fluxo <do> setor', '<svg id="x"></svg>', '25/09/2026');
    expect(html).toContain('<svg id="x"></svg>');
    expect(html).toContain('Fluxo &lt;do&gt; setor');
    expect(html).toContain(escaparHtml(NOTA_PROPRIEDADE));
  });
});

describe('impressao.css — papel e cores', () => {
  const semComentarios = impressaoCss.replace(/\/\*[\s\S]*?\*\//g, '');
  it('fluxograma em A3 paisagem e texto em A4, por página nomeada', () => {
    expect(semComentarios).toMatch(/@page fluxo\s*{[^}]*size:\s*A3 landscape/);
    expect(semComentarios).toMatch(/@page texto\s*{[^}]*size:\s*A4;/);
    expect(semComentarios).toMatch(/\.impressao--fluxo\s*{\s*page:\s*fluxo/);
    expect(semComentarios).toMatch(/\.impressao--texto\s*{\s*page:\s*texto/);
  });
  it('na impressão: fundo branco, texto chumbo, o resto da página some e o amarelo só aparece em filetes (border)', () => {
    expect(semComentarios).toMatch(/html\.imprimindo body\s*{[^}]*background:\s*var\(--branco\)[^}]*color:\s*var\(--chumbo\)/);
    expect(semComentarios).toMatch(/body > \*:not\(\.impressao\)\s*{\s*display:\s*none\s*!important/);
    const usosDoAmarelo = semComentarios.split('\n').filter((l) => l.includes('var(--amarelo)'));
    expect(usosDoAmarelo.length).toBeGreaterThan(0);
    for (const l of usosDoAmarelo) expect(l, l).toMatch(/border/);
  });
  it('a área fica oculta na tela', () => {
    expect(semComentarios).toMatch(/^\.impressao\s*{\s*display:\s*none;/m);
  });
});

describe('.mermaid exportado é Mermaid válido (parser real do Mermaid 12)', () => {
  const efetiva = matrizComEdicoes(MATRIZ_V08, DOCUMENTO_FICHAS, estadoFpeVazio());
  const agora = new Date(2026, 8, 25);

  it('os 12 setores e as 4 fases passam em mermaid.parse, com o cabeçalho de comentários', async () => {
    // sensibilidade: o parser recusa texto quebrado (senão o teste abaixo provaria nada)
    await expect(mermaid.parse('flowchart LR\n  a["sem fechar')).rejects.toThrow();
    for (const s of MATRIZ_V08.setores) {
      const texto = exportarMermaidSetor(efetiva, s.id, agora);
      await expect(mermaid.parse(texto), s.nome).resolves.toBeTruthy();
    }
    for (const f of MATRIZ_V08.fases) {
      await expect(mermaid.parse(exportarMermaidFase(efetiva, f.id, agora)), `fase ${f.id}`).resolves.toBeTruthy();
    }
  }, 60_000);
});
