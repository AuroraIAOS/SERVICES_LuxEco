import { useState } from 'react';
import type { Bloco, Pop } from '../../pop/gerar';
import { Botao, Etiqueta, Pilula } from '../../ui';

function Tabela({ colunas, linhas, legenda }: { colunas: string[]; linhas: string[][]; legenda: string }) {
  return (
    <div className="pop-tabela-rolagem" role="region" aria-label={legenda} tabIndex={0}>
      <table className="pop-tabela">
        <caption className="so-leitor">{legenda}</caption>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              {l.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlocoPop({ bloco, legenda }: { bloco: Bloco; legenda: string }) {
  switch (bloco.tipo) {
    case 'paragrafo':
      return <p>{bloco.texto}</p>;
    case 'subtitulo':
      return <h4 className="pop-subtitulo">{bloco.texto}</h4>;
    case 'aviso':
      return (
        <p className="pop-aviso" role="note">
          {bloco.texto}
        </p>
      );
    case 'lista':
      return (
        <ul className="pop-lista">
          {bloco.itens.map((i, k) => (
            <li key={k}>{i}</li>
          ))}
        </ul>
      );
    case 'passos':
      return (
        <ol className="pop-passos">
          {bloco.passos.map((p) => (
            <li key={p.numero} className="pop-passo">
              <p className="pop-passo__texto">
                {p.texto}
                {p.ifElse && (
                  <>
                    {' '}
                    <Etiqueta variante="ifelse">IF/ELSE</Etiqueta>
                  </>
                )}
              </p>
              <dl className="pop-passo__detalhes">
                {p.detalhes.map((d) => (
                  <div key={d.rotulo}>
                    <dt>{d.rotulo}</dt> <dd>{d.valor}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      );
    case 'tabela':
      return <Tabela colunas={bloco.colunas} linhas={bloco.linhas} legenda={legenda} />;
    case 'respostas':
      return (
        <dl className="pop-respostas">
          {bloco.itens.map((i) => (
            <div key={i.pergunta}>
              <dt>{i.pergunta}</dt>
              <dd>{i.resposta}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

/**
 * O POP gerado: 11 seções em acordeão (o POP geral é longo). A seção 11 (revisão jurídica) fica sempre por último.
 * Só mostra; o conteúdo vem de `gerarPop` (src/pop/gerar.ts).
 */
export function PopGerado({ pop, desatualizado }: { pop: Pop; desatualizado: boolean }) {
  const [abertas, setAbertas] = useState<ReadonlySet<number>>(() => new Set([1]));
  const alternar = (n: number, aberta: boolean) =>
    setAbertas((atual) => {
      const novo = new Set(atual);
      if (aberta) novo.add(n);
      else novo.delete(n);
      return novo;
    });
  const todasAbertas = abertas.size === pop.secoes.length;

  return (
    <article className="pop-gerado" aria-label={pop.titulo}>
      <header className="pop-gerado__cabecalho">
        <div>
          <h2 className="pop-gerado__titulo">{pop.titulo}</h2>
          <p className="pop-gerado__subtitulo">{pop.subtitulo}</p>
        </div>
        <Botao variante="discreto" onClick={() => setAbertas(todasAbertas ? new Set() : new Set(pop.secoes.map((s) => s.numero)))}>
          {todasAbertas ? 'Fechar todas as seções' : 'Abrir todas as seções'}
        </Botao>
      </header>
      {desatualizado && (
        <p role="status" className="pop-aviso">
          Você mudou uma resposta depois de gerar este POP. Gere de novo para ver a mudança.
        </p>
      )}
      {pop.secoes.map((s) => (
        <Pilula key={s.numero} numero={String(s.numero).padStart(2, '0')} nome={s.titulo} nivel={3} aberta={abertas.has(s.numero)} aoAlternar={(a) => alternar(s.numero, a)}>
          <div className="pop-secao">
            {s.blocos.map((b, i) => (
              <BlocoPop key={i} bloco={b} legenda={`${s.titulo}: tabela ${i + 1}`} />
            ))}
          </div>
        </Pilula>
      ))}
    </article>
  );
}
