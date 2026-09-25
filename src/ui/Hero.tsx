import type { ReactNode } from 'react';
import { useId } from 'react';
import { SeloSol } from './Marca';

export interface NumeroDoResumo {
  valor: number | string;
  rotulo: string;
}

/** Números do resumo em linha (“236 ações”), sempre calculados dos dados — nunca digitados. */
export function Numeros({ itens, rotulo = 'Resumo' }: { itens: readonly NumeroDoResumo[]; rotulo?: string }) {
  return (
    <ul className="numeros" aria-label={rotulo}>
      {itens.map((n) => (
        <li key={n.rotulo}>
          <strong>{typeof n.valor === 'number' ? n.valor.toLocaleString('pt-BR') : n.valor}</strong> {n.rotulo}
        </li>
      ))}
    </ul>
  );
}

/** Abertura compacta da tela: selo da marca, título (h1), subtítulo e o que a tela quiser mostrar embaixo. */
export function Hero({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: ReactNode }) {
  const id = useId();
  return (
    <section className="hero" aria-labelledby={id}>
      <SeloSol grande />
      <div className="hero__texto">
        <h1 id={id} className="hero__titulo">
          {titulo}
        </h1>
        {subtitulo && <p className="hero__subtitulo">{subtitulo}</p>}
        {children}
      </div>
    </section>
  );
}
