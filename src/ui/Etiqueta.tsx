import type { ReactNode } from 'react';
import { cls } from './identidade';

export type VarianteEtiqueta = 'ifelse' | 'whatsapp' | 'neutra';

/** Marca curta numa ação: “IF/ELSE” (decisão) ou “WhatsApp” (Grupo de Fluxo). O texto explica; a cor só reforça. */
export function Etiqueta({ variante = 'neutra', children }: { variante?: VarianteEtiqueta; children: ReactNode }) {
  return <span className={cls('etiqueta', `etiqueta--${variante}`)}>{children}</span>;
}

/** Ramo de uma condicional: ✓ para o 1º caminho (se_sim) e ✗ para o 2º (se_nao). O símbolo é decorativo; o rótulo diz o caminho. */
export function Ramo({ sim, rotulo, texto }: { sim: boolean; rotulo: string; texto: string }) {
  return (
    <p className={cls('ramo', sim ? 'ramo--sim' : 'ramo--nao')}>
      <span className="ramo__simbolo" aria-hidden="true">
        {sim ? '✓' : '✗'}
      </span>
      <span className="ramo__rotulo">{rotulo}</span> → {texto}
    </p>
  );
}
