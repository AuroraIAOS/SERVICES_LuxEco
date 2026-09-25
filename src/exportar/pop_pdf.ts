// POP em PDF por impressão do navegador, A4 (03.2). Mesma estrutura `Pop` do .docx; a tipografia da marca vem do CSS de
// impressão (src/estilos/impressao.css, só tokens). O título da aba vira o nome sugerido do arquivo (`imprimir`).
import type { Bloco, Pop } from '../pop/gerar';
import { escaparHtml, imprimir, moldura } from './pdf';

const linhas = (t: string) =>
  t
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => escaparHtml(l))
    .join('<br>');

export function htmlBloco(b: Bloco): string {
  switch (b.tipo) {
    case 'paragrafo':
      return `<p>${linhas(b.texto)}</p>`;
    case 'subtitulo':
      return `<h3>${escaparHtml(b.texto)}</h3>`;
    case 'aviso':
      return `<p class="impressao__aviso">${escaparHtml(b.texto)}</p>`;
    case 'lista':
      return `<ul class="impressao__lista">${b.itens.map((i) => `<li>${linhas(i)}</li>`).join('')}</ul>`;
    case 'passos':
      return b.passos
        .map(
          (p) =>
            `<article class="impressao__passo"><h4>${p.numero}. ${escaparHtml(p.texto)}${p.ifElse ? ' <span class="impressao__decisao">(IF/ELSE)</span>' : ''}</h4><dl>` +
            p.detalhes.map((d) => `<dt>${escaparHtml(d.rotulo)}</dt><dd>${linhas(d.valor)}</dd>`).join('') +
            `</dl></article>`,
        )
        .join('');
    case 'tabela':
      return (
        `<table class="impressao__tabela"><thead><tr>${b.colunas.map((c) => `<th scope="col">${escaparHtml(c)}</th>`).join('')}</tr></thead><tbody>` +
        b.linhas.map((l) => `<tr>${l.map((c) => `<td>${linhas(c)}</td>`).join('')}</tr>`).join('') +
        `</tbody></table>`
      );
    case 'respostas':
      return `<div class="impressao__respostas">${b.itens.map((i) => `<p class="impressao__pergunta">${escaparHtml(i.pergunta)}</p><p>${linhas(i.resposta)}</p>`).join('')}</div>`;
  }
}

/** HTML da área de impressão: capa em cabeçalho, sumário e as 11 seções, com a nota de propriedade intelectual no rodapé. */
export function htmlPop(pop: Pop, dataTexto: string): string {
  const sumario = `<nav class="impressao__sumario" aria-label="Sumário"><h2>Sumário</h2><ol>${pop.secoes.map((s) => `<li>${s.numero}. ${escaparHtml(s.titulo)}</li>`).join('')}</ol></nav>`;
  const secoes = pop.secoes.map((s) => `<section class="impressao__secao-pop"><h2>${s.numero}. ${escaparHtml(s.titulo)}</h2>${s.blocos.map(htmlBloco).join('')}</section>`).join('');
  return moldura(pop.titulo, dataTexto, `<p class="impressao__subtitulo">${escaparHtml(pop.subtitulo)}</p>${sumario}${secoes}`);
}

export function imprimirPop(pop: Pop, dataTexto: string, nomeSugerido: string): void {
  imprimir(htmlPop(pop, dataTexto), 'a4', nomeSugerido);
}
