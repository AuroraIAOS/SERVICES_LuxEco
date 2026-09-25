import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useId } from 'react';
import { cls } from './identidade';

/** Filete lateral na cor do setor: `cor_token` da V08 (“setor-vendas”) vira `var(--setor-vendas)`. */
export function estiloDoSetor(corToken?: string): CSSProperties | undefined {
  return corToken ? ({ '--cor-setor': `var(--${corToken})` } as CSSProperties) : undefined;
}

export interface CartaoProps {
  titulo?: ReactNode;
  /** nível do título (h2 por padrão). */
  nivel?: 2 | 3 | 4;
  /** `cor_token` do setor: só o filete usa a cor; o texto continua branco (contraste AA). */
  setor?: string;
  /** botões ou etiquetas alinhados ao título. */
  acoes?: ReactNode;
  como?: ElementType;
  className?: string;
  children?: ReactNode;
}

/** Superfície plana (chumbo-mid) — sem sombra e sem raio; o setor aparece só como filete. */
export function Cartao({ titulo, nivel = 2, setor, acoes, como: Tag = 'section', className, children }: CartaoProps) {
  const id = useId();
  const Titulo = `h${nivel}` as ElementType;
  return (
    <Tag className={cls('cartao', setor && 'cartao--setor', className)} style={estiloDoSetor(setor)} aria-labelledby={titulo ? id : undefined}>
      {(titulo || acoes) && (
        <div className="cartao__cabecalho">
          {titulo && (
            <Titulo id={id} className="cartao__titulo">
              {titulo}
            </Titulo>
          )}
          {acoes && <div className="cartao__acoes">{acoes}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
