// PDF por impressão do navegador (“Salvar como PDF”): o conteúdo entra numa área própria (#lux-impressao) e o CSS de
// impressão (src/estilos/impressao.css) esconde o resto da página. Fundo branco, texto chumbo, amarelo só em filetes.
// Fluxograma: A3 paisagem (tema claro). Fichas: A4.
import { NOME_APP, NOME_MARCA, NOTA_PROPRIEDADE } from '../ui/identidade';
import type { DocumentoFichasTexto } from './documento';
import { valorOuTravessao } from './documento';

export type Papel = 'a3' | 'a4';
export const ID_AREA_IMPRESSAO = 'lux-impressao';

export const escaparHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const moldura = (titulo: string, dataTexto: string, corpo: string) =>
  `<header class="impressao__topo"><p class="impressao__marca">${escaparHtml(NOME_MARCA)}</p><h1>${escaparHtml(titulo)}</h1>` +
  `<p class="impressao__meta">${escaparHtml(NOME_APP)} · exportado em ${escaparHtml(dataTexto)}</p></header>` +
  `${corpo}<footer class="impressao__rodape"><p>${escaparHtml(NOTA_PROPRIEDADE)}</p></footer>`;

/** `svg` já vem escapado do gerador de raias (tema claro); entra como marcação. */
export function htmlFluxo(titulo: string, svg: string, dataTexto: string): string {
  return moldura(titulo, dataTexto, `<div class="impressao__fluxo">${svg}</div>`);
}

const paragrafos = (valor: string) =>
  valorOuTravessao(valor)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => escaparHtml(l))
    .join('<br>');

export function htmlFichas(doc: DocumentoFichasTexto, dataTexto: string): string {
  const corpo = doc.setores
    .map((s) => {
      const fases = s.fases
        .map(
          (fase) =>
            `<section class="impressao__fase"><h2>${escaparHtml(fase.titulo)}</h2>` +
            fase.estagios
              .map(
                (e) =>
                  `<section class="impressao__estagio"><h3>${escaparHtml(e.titulo)}</h3>` +
                  e.fichas
                    .map(
                      (f) =>
                        `<article class="impressao__ficha"><h4>${escaparHtml(f.titulo)}${f.ifElse ? ' <span class="impressao__decisao">(IF/ELSE)</span>' : ''}</h4><dl>` +
                        f.campos.map((c) => `<dt>${escaparHtml(c.rotulo)}</dt><dd>${paragrafos(c.valor)}</dd>`).join('') +
                        `</dl></article>`,
                    )
                    .join('') +
                  `</section>`,
              )
              .join('') +
            `</section>`,
        )
        .join('');
      return doc.escopo === 'geral' ? `<section class="impressao__setor"><h2 class="impressao__nome-setor">Setor ${escaparHtml(s.nome)}</h2>${fases}</section>` : fases;
    })
    .join('');
  return moldura(doc.titulo, dataTexto, corpo);
}

/**
 * Abre a impressão do navegador com `html` em `papel`. O título da aba vira o nome sugerido do arquivo enquanto imprime.
 * Limpa a área ao terminar (`afterprint`); se o navegador nunca avisar, a área fica oculta na tela e é trocada na próxima.
 */
export function imprimir(html: string, papel: Papel, nomeSugerido: string): void {
  document.getElementById(ID_AREA_IMPRESSAO)?.remove();
  const area = document.createElement('div');
  area.id = ID_AREA_IMPRESSAO;
  area.className = `impressao impressao--${papel === 'a3' ? 'fluxo' : 'texto'}`;
  area.innerHTML = html;
  document.body.appendChild(area);
  const raiz = document.documentElement;
  const tituloAntes = document.title;
  raiz.classList.add('imprimindo');
  document.title = nomeSugerido;
  const limpar = () => {
    window.removeEventListener('afterprint', limpar);
    area.remove();
    raiz.classList.remove('imprimindo');
    document.title = tituloAntes;
  };
  window.addEventListener('afterprint', limpar);
  window.print();
}
