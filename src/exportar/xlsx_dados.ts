// Estrutura do .xlsx (03.4): abas, colunas e linhas, sem depender do SheetJS (puro e testável). 17 abas:
// 12 setores (fichas 5W1H em vigor) + 4 bibliotecas (documentos, ferramentas, investimentos, KPIs) + 1 POP geral.
// O SheetJS Community não grava estilo de célula (só Pro): a “marca” está nos cabeçalhos, nas larguras, nas propriedades do
// arquivo e na nota de propriedade intelectual no fim de cada aba. Todo valor é TEXTO (nunca vira fórmula) e nunca é truncado.
import type { Bibliotecas, MatrizV08, PopTemplates } from '../dados/tipos';
import type { Bloco, Pop } from '../pop/gerar';
import type { Fpe } from '../telas/fpe/modelo';
import { NOME_APP, NOME_MARCA, NOTA_PROPRIEDADE } from '../ui/identidade';

export interface Aba {
  nome: string;
  colunas: string[];
  linhas: string[][];
  /** largura de cada coluna em caracteres (`wch` do SheetJS). */
  larguras: number[];
}

export interface PastaXlsx {
  titulo: string;
  autor: string;
  /** vai numa linha própria, depois de uma linha em branco, no fim de cada aba. */
  nota: string;
  abas: Aba[];
}

/** Limite de uma célula do Excel; o teste garante que nada chega perto (nada é truncado). */
export const LIMITE_CELULA = 32_767;
export const LIMITE_NOME_ABA = 31;
const NOME_ABA_PROIBIDO = /[\\/?*[\]:]/;
export const nomeDeAbaValido = (n: string) => n.length > 0 && n.length <= LIMITE_NOME_ABA && !NOME_ABA_PROIBIDO.test(n);

const pad2 = (n: number) => String(n).padStart(2, '0');
const estagiosTexto = (ids: number[]) => ids.map((id) => `Est. ${pad2(id)}`).join(', ');

const LARGURA_MIN = 10;
const LARGURA_MAX = 60;
function larguras(colunas: string[], linhas: string[][]): number[] {
  return colunas.map((c, i) => {
    const maior = Math.max(c.length, ...linhas.map((l) => Math.max(0, ...(l[i] ?? '').split('\n').map((t) => t.length))));
    return Math.min(LARGURA_MAX, Math.max(LARGURA_MIN, maior + 2));
  });
}
const aba = (nome: string, colunas: string[], linhas: string[][]): Aba => ({ nome, colunas, linhas, larguras: larguras(colunas, linhas) });

/** Achata o POP geral em linhas: uma por parágrafo, item, passo, detalhe, linha de tabela e resposta. */
export function linhasDoPop(pop: Pop, v08: MatrizV08): string[][] {
  const nomesDeSetor = new Set(v08.setores.map((s) => s.nome));
  const linhas: string[][] = [];
  for (const s of pop.secoes) {
    const secao = `${s.numero}. ${s.titulo}`;
    let setor = '';
    const nova = (tipo: string, conteudo: string) => linhas.push([secao, setor, tipo, conteudo]);
    for (const b of s.blocos as Bloco[]) {
      switch (b.tipo) {
        case 'subtitulo':
          if (nomesDeSetor.has(b.texto)) setor = b.texto;
          nova('Subtítulo', b.texto);
          break;
        case 'paragrafo':
          nova('Texto', b.texto);
          break;
        case 'aviso':
          nova('Aviso', b.texto);
          break;
        case 'lista':
          for (const i of b.itens) nova('Item', i);
          break;
        case 'passos':
          for (const p of b.passos) {
            nova('Passo', `${p.numero}. ${p.texto}${p.ifElse ? ' (IF/ELSE)' : ''}`);
            for (const d of p.detalhes) nova(d.rotulo, d.valor);
          }
          break;
        case 'tabela':
          nova('Tabela — colunas', b.colunas.join(' | '));
          for (const l of b.linhas) nova('Tabela — linha', l.join(' | '));
          break;
        case 'respostas':
          for (const i of b.itens) {
            nova('Pergunta', i.pergunta);
            nova('Resposta', i.resposta);
          }
          break;
      }
    }
  }
  return linhas;
}

export function montarPastaXlsx(e: { v08: MatrizV08; fpe: Fpe; bibliotecas: Bibliotecas; templates: PopTemplates; popGeral: Pop }): PastaXlsx {
  const { v08, fpe, bibliotecas, templates, popGeral } = e;
  const t = templates.textos;
  const nomeSetor = new Map(v08.setores.map((s) => [s.id, s.nome]));
  const setores = (ids: string[]) => ids.map((id) => nomeSetor.get(id) ?? id).join(', ');
  const aDefinir = t.meta_a_definir ?? '';

  const abasSetor = fpe.setores.map((s) =>
    aba(
      s.setor.nome,
      ['Estágio', 'Nome do estágio', 'Decisão IF/ELSE', 'O quê', 'Por quê', 'Onde', 'Quando', 'Quem', 'Como'],
      s.estagios.flatMap((est) => est.fichas.map((f) => [est.numero, est.estagio.nome, f.ifElse ? 'IF/ELSE' : '', f.valores.what, f.valores.why, f.valores.where, f.valores.when, f.valores.who, f.valores.how])),
    ),
  );

  const situacao = (s: string) => t[`situacao_${s}`] ?? s;
  const abasBiblioteca = [
    aba('Documentos', ['Documento', 'Estágios', 'Setores'], bibliotecas.documentos.map((d) => [d.nome, estagiosTexto(d.estagio_ids), setores(d.setor_ids)])),
    aba(
      'Ferramentas',
      ['Ferramenta', 'Situação', 'Setores', 'Estágios', 'Observação'],
      bibliotecas.ferramentas.map((f) => [f.nome, situacao(f.situacao), setores(f.setor_ids), estagiosTexto(f.estagio_ids), f.observacao ?? '']),
    ),
    aba('Investimentos', ['Categoria', 'Descrição', 'Setores', 'Valor estimado'], bibliotecas.investimentos.map((i) => [i.categoria, i.descricao, setores(i.setor_ids), aDefinir])),
    aba(
      'KPIs',
      ['Setor', 'Tipo', 'Indicador', 'Como calcular', 'Meta', 'Indicador de acompanhamento'],
      bibliotecas.kpis.map((k) => [nomeSetor.get(k.setor_id) ?? k.setor_id, k.tipo === 'produtividade' ? 'Produtividade' : 'Eficiência', k.nome, k.formula_descricao, aDefinir, k.acompanhamento ? 'Sim' : '']),
    ),
  ];

  const abaPop = aba('POP geral', ['Seção', 'Setor', 'Tipo', 'Conteúdo'], linhasDoPop(popGeral, v08));

  return { titulo: `${NOME_APP} — fichas 5W1H, bibliotecas e POP geral`, autor: NOME_MARCA, nota: NOTA_PROPRIEDADE, abas: [...abasSetor, ...abasBiblioteca, abaPop] };
}
