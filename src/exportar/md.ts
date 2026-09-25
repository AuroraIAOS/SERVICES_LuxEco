// Markdown legível das fichas (por setor ou de todos). Puro.
import { NOME_APP, NOTA_PROPRIEDADE } from '../ui/identidade';
import type { DocumentoFichasTexto, FichaDoc } from './documento';
import { valorOuTravessao } from './documento';

const titulo = (nivel: number, texto: string) => `${'#'.repeat(nivel)} ${texto.replace(/\s+/g, ' ').trim()}`;

/** “Como” com várias linhas continua dentro do item da lista: as linhas seguintes entram recuadas. */
const item = (rotulo: string, valor: string) => {
  const [primeira = '', ...resto] = valorOuTravessao(valor).replace(/\r\n?/g, '\n').split('\n');
  return [`- **${rotulo}:** ${primeira}`, ...resto.map((l) => (l.trim() === '' ? '' : `  ${l}`))].join('\n');
};

const ficha = (nivel: number, f: FichaDoc) =>
  [titulo(nivel, f.ifElse ? `${f.titulo} (IF/ELSE)` : f.titulo), '', ...f.campos.map((c) => item(c.rotulo, c.valor)), ''].join('\n');

/** `dataTexto` = “25/09/2026” (a tela formata; o Markdown só repete). */
export function renderizarMd(doc: DocumentoFichasTexto, dataTexto: string): string {
  const geral = doc.escopo === 'geral';
  const n = geral ? 1 : 0; // no documento geral cada setor ganha um título e tudo desce um nível
  const partes: string[] = [titulo(1, doc.titulo), '', `_${NOME_APP} · exportado em ${dataTexto}_`, '', `> ${NOTA_PROPRIEDADE}`, ''];
  for (const s of doc.setores) {
    if (geral) partes.push(titulo(2, `Setor ${s.nome}`), '');
    for (const fase of s.fases) {
      partes.push(titulo(2 + n, fase.titulo), '');
      for (const e of fase.estagios) {
        partes.push(titulo(3 + n, e.titulo), '');
        for (const f of e.fichas) partes.push(ficha(4 + n, f));
      }
    }
  }
  return `${partes.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}
