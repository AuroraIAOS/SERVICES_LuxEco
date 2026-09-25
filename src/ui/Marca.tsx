import { NOME_MARCA_DESTAQUE, NOME_MARCA_INICIO, cls } from './identidade';

/** Estrela dentro do anel: o selo do MMO_v01. Decorativo (o nome da marca vem em texto). */
export function SeloSol({ grande = false }: { grande?: boolean }) {
  return (
    <span className={cls('selo', grande && 'selo--grande')} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    </span>
  );
}

/** “LUX ECO SOLUTIONS” — SOLUTIONS em amarelo, como no MMO_v01. */
export function Marca() {
  return (
    <span className="marca">
      {NOME_MARCA_INICIO} <strong>{NOME_MARCA_DESTAQUE}</strong>
    </span>
  );
}
