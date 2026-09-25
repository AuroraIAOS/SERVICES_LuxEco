import type { ReactNode } from 'react';

/** Tela ou lista sem conteúdo: diz o que falta e o que fazer agora (não é um lugar para tom de marca). */
export function EstadoVazio({ titulo, texto, acao }: { titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <section className="vazio" aria-label={titulo}>
      <h2 className="vazio__titulo">{titulo}</h2>
      <p className="vazio__texto">{texto}</p>
      {acao && <div className="vazio__acao">{acao}</div>}
    </section>
  );
}
