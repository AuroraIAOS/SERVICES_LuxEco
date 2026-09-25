import type { ReactNode } from 'react';
import { useId } from 'react';

/** Seção da tela MMO: título (h2) que nomeia a região e uma frase de orientação (o que fazer aqui). */
export function Secao({ titulo, dica, children }: { titulo: string; dica?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="mmo-secao" aria-labelledby={id}>
      <h2 id={id} className="mmo-secao__titulo">
        {titulo}
      </h2>
      {dica && <p className="mmo-secao__dica">{dica}</p>}
      {children}
    </section>
  );
}

/** “A”, “A e B”, “A, B e C”. */
export function listaEmTexto(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]!}`;
}
