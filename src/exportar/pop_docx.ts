// POP em .docx (03.2), com a biblioteca `docx` (API confirmada na doc oficial). Uma estrutura só: `Pop` (src/pop/gerar.ts).
// Capa, sumário fixo, 11 seções (cada uma um Título 1 “N. Título”) e rodapé com a nota de propriedade intelectual.
// Cores e fonte vêm só de design/tokens.json; o texto do corpo é chumbo sobre página branca (a impressão do FPE usa o mesmo par).
import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import tokens from '../../design/tokens.json' with { type: 'json' };
import type { Bloco, Pop } from '../pop/gerar';
import { NOME_APP, NOME_MARCA, NOTA_PROPRIEDADE } from '../ui/identidade';

const semHash = (cor: string) => cor.replace('#', '');
const COR = { texto: semHash(tokens.cores.chumbo), filete: semHash(tokens.cores.amarelo), linha: semHash(tokens.cores['chumbo-lighter']) };
const FONTE = tokens.tipografia.familia;
/** meio-pontos: 22 = 11 pt. */
const TAMANHO = { corpo: 22, pequeno: 18, titulo1: 30, titulo2: 24, capa: 56 };
const RECUO_DETALHE = 360;

const trecho = (texto: string, extra: { bold?: boolean; italics?: boolean; size?: number } = {}) => new TextRun({ text: texto, font: FONTE, color: COR.texto, size: TAMANHO.corpo, ...extra });

/** Texto com quebras de linha vira uma sequência de TextRun com `break`. */
function trechos(texto: string, extra: { bold?: boolean; italics?: boolean; size?: number } = {}): TextRun[] {
  return texto
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((linha, i) => new TextRun({ text: linha, break: i === 0 ? undefined : 1, font: FONTE, color: COR.texto, size: TAMANHO.corpo, ...extra }));
}

const paragrafo = (texto: string, extra: { bold?: boolean; italics?: boolean } = {}) => new Paragraph({ children: trechos(texto, extra), spacing: { after: 120 } });

const titulo = (texto: string, nivel: 'h1' | 'h2') =>
  new Paragraph({
    heading: nivel === 'h1' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: nivel === 'h1' ? 360 : 240, after: 120 },
    border: nivel === 'h1' ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: COR.filete, space: 2 } } : undefined,
    children: [trecho(texto, { bold: true, size: nivel === 'h1' ? TAMANHO.titulo1 : TAMANHO.titulo2 })],
  });

const linhaDeTabela = (celulas: string[], cabecalho: boolean) =>
  new TableRow({
    tableHeader: cabecalho,
    cantSplit: true,
    children: celulas.map(
      (c) =>
        new TableCell({
          shading: cabecalho ? { type: ShadingType.CLEAR, color: 'auto', fill: COR.filete } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: trechos(c, { bold: cabecalho, size: TAMANHO.pequeno + 2 }) })],
        }),
    ),
  });

const borda = { style: BorderStyle.SINGLE, size: 4, color: COR.linha };

function blocoParaDocx(b: Bloco): (Paragraph | Table)[] {
  switch (b.tipo) {
    case 'paragrafo':
      return [paragrafo(b.texto)];
    case 'subtitulo':
      return [titulo(b.texto, 'h2')];
    case 'aviso':
      return [paragrafo(b.texto, { italics: true })];
    case 'lista':
      return b.itens.map((i) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: trechos(i) }));
    case 'passos':
      return b.passos.flatMap((p) => [
        new Paragraph({ keepNext: true, spacing: { before: 120, after: 40 }, children: trechos(`${p.numero}. ${p.texto}${p.ifElse ? ' (IF/ELSE)' : ''}`, { bold: true }) }),
        ...p.detalhes.map(
          (d) => new Paragraph({ indent: { left: RECUO_DETALHE }, spacing: { after: 40 }, children: [trecho(`${d.rotulo}: `, { bold: true }), ...trechos(d.valor)] }),
        ),
      ]);
    case 'tabela':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: borda, bottom: borda, left: borda, right: borda, insideHorizontal: borda, insideVertical: borda },
          rows: [linhaDeTabela(b.colunas, true), ...b.linhas.map((l) => linhaDeTabela(l, false))],
        }),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
      ];
    case 'respostas':
      return b.itens.flatMap((i) => [
        new Paragraph({ keepNext: true, spacing: { before: 120, after: 40 }, children: trechos(i.pergunta, { bold: true }) }),
        new Paragraph({ indent: { left: RECUO_DETALHE }, spacing: { after: 80 }, children: trechos(i.resposta) }),
      ]);
  }
}

/** Monta o documento Word do POP. `dataTexto` = a data de geração, já formatada (“25/09/2026”). */
export function montarDocx(pop: Pop, dataTexto: string): Document {
  const capa = [
    new Paragraph({ spacing: { before: 2400, after: 120 }, children: [trecho(NOME_MARCA, { bold: true, size: TAMANHO.corpo })] }),
    new Paragraph({
      spacing: { after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 36, color: COR.filete, space: 6 } },
      children: [trecho(pop.titulo, { bold: true, size: TAMANHO.capa })],
    }),
    paragrafo(pop.subtitulo),
    paragrafo(`${NOME_APP} · gerado em ${dataTexto}`),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ spacing: { after: 160 }, children: [trecho('Sumário', { bold: true, size: TAMANHO.titulo1 })] }),
    ...pop.secoes.map((s) => new Paragraph({ spacing: { after: 80 }, children: [trecho(`${s.numero}. ${s.titulo}`)] })),
    new Paragraph({ children: [new PageBreak()] }),
  ];
  const corpo = pop.secoes.flatMap((s) => [titulo(`${s.numero}. ${s.titulo}`, 'h1'), ...s.blocos.flatMap(blocoParaDocx)]);

  return new Document({
    creator: NOME_MARCA,
    title: pop.titulo,
    description: pop.subtitulo,
    sections: [
      {
        headers: { default: new Header({ children: [new Paragraph({ children: [trecho(`${NOME_MARCA} · ${pop.titulo}`, { size: TAMANHO.pequeno })] })] }) },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({ children: [trecho(NOTA_PROPRIEDADE, { size: TAMANHO.pequeno - 2 })] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [trecho('Página ', { size: TAMANHO.pequeno }), new TextRun({ children: [PageNumber.CURRENT], font: FONTE, color: COR.texto, size: TAMANHO.pequeno }), trecho(' de ', { size: TAMANHO.pequeno }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONTE, color: COR.texto, size: TAMANHO.pequeno })],
              }),
            ],
          }),
        },
        children: [...capa, ...corpo],
      },
    ],
  });
}

/** Bytes do `.docx` (funciona no navegador e no Node). */
export async function gerarDocx(pop: Pop, dataTexto: string): Promise<Uint8Array> {
  return new Uint8Array(await Packer.toArrayBuffer(montarDocx(pop, dataTexto)));
}
