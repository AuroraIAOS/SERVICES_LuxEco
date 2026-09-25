import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';
import { cls } from './identidade';

/** Propriedades comuns: rótulo sempre visível, ajuda opcional e erro em texto (nunca só cor). */
export interface BaseCampo {
  rotulo: string;
  ajuda?: string;
  /** mensagem do erro; vazio = campo válido. Diga o que corrigir, sem pedir desculpas. */
  erro?: string;
  obrigatorio?: boolean;
}

interface Envoltorio extends BaseCampo {
  id: string;
  idAjuda: string;
  idErro: string;
  children: ReactNode;
}

function Envoltorio({ id, idAjuda, idErro, rotulo, ajuda, erro, obrigatorio, children }: Envoltorio) {
  return (
    <div className={cls('campo', erro && 'campo--erro')}>
      <label htmlFor={id} className="campo__rotulo">
        {rotulo}
        {obrigatorio && (
          <span className="campo__obrigatorio" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {ajuda && (
        <p id={idAjuda} className="campo__ajuda">
          {ajuda}
        </p>
      )}
      {children}
      {erro && (
        <p id={idErro} className="campo__erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

/** ids e atributos de acessibilidade que todo controle recebe. */
function useAtributos(base: BaseCampo, idExterno?: string) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const descrito = [base.ajuda ? idAjuda : '', base.erro ? idErro : ''].filter(Boolean).join(' ') || undefined;
  return {
    id,
    idAjuda,
    idErro,
    atributos: { id, 'aria-invalid': base.erro ? true : undefined, 'aria-describedby': descrito, 'aria-required': base.obrigatorio || undefined },
  };
}

export const CampoTexto = forwardRef<HTMLInputElement, BaseCampo & InputHTMLAttributes<HTMLInputElement>>(function CampoTexto(
  { rotulo, ajuda, erro, obrigatorio, id: idExterno, className, ...resto },
  ref,
) {
  const { id, idAjuda, idErro, atributos } = useAtributos({ rotulo, ajuda, erro, obrigatorio }, idExterno);
  return (
    <Envoltorio {...{ id, idAjuda, idErro, rotulo, ajuda, erro, obrigatorio }}>
      <input ref={ref} type="text" className={cls('campo__controle', className)} {...atributos} {...resto} />
    </Envoltorio>
  );
});

/** Área de texto para os campos longos do 5W1H (por quê, como…). */
export const CampoAreaTexto = forwardRef<HTMLTextAreaElement, BaseCampo & TextareaHTMLAttributes<HTMLTextAreaElement>>(function CampoAreaTexto(
  { rotulo, ajuda, erro, obrigatorio, id: idExterno, className, rows = 4, ...resto },
  ref,
) {
  const { id, idAjuda, idErro, atributos } = useAtributos({ rotulo, ajuda, erro, obrigatorio }, idExterno);
  return (
    <Envoltorio {...{ id, idAjuda, idErro, rotulo, ajuda, erro, obrigatorio }}>
      <textarea ref={ref} rows={rows} className={cls('campo__controle', 'campo__controle--longo', className)} {...atributos} {...resto} />
    </Envoltorio>
  );
});

export interface OpcaoSeletor {
  valor: string;
  rotulo: string;
}

export const CampoSeletor = forwardRef<HTMLSelectElement, BaseCampo & SelectHTMLAttributes<HTMLSelectElement> & { opcoes: readonly OpcaoSeletor[] }>(
  function CampoSeletor({ rotulo, ajuda, erro, obrigatorio, id: idExterno, className, opcoes, ...resto }, ref) {
    const { id, idAjuda, idErro, atributos } = useAtributos({ rotulo, ajuda, erro, obrigatorio }, idExterno);
    return (
      <Envoltorio {...{ id, idAjuda, idErro, rotulo, ajuda, erro, obrigatorio }}>
        <select ref={ref} className={cls('campo__controle', className)} {...atributos} {...resto}>
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </Envoltorio>
    );
  },
);

/** Caixa de marcação ou opção (rádio) com o texto ao lado, clicável inteiro. `erro` em texto, nunca só cor. */
export const CampoMarcacao = forwardRef<HTMLInputElement, { rotulo: ReactNode; erro?: string; tipo?: 'checkbox' | 'radio' } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(function CampoMarcacao(
  { rotulo, erro, tipo = 'checkbox', id: idExterno, className, ...resto },
  ref,
) {
  const gerado = useId();
  const id = idExterno ?? gerado;
  const idErro = `${id}-erro`;
  return (
    <div className={cls('campo', 'campo--marcacao', erro && 'campo--erro')}>
      <label htmlFor={id} className="campo__marcacao">
        <input ref={ref} id={id} type={tipo} className={cls('campo__caixa', className)} aria-invalid={erro ? true : undefined} aria-describedby={erro ? idErro : undefined} {...resto} />
        <span>{rotulo}</span>
      </label>
      {erro && (
        <p id={idErro} className="campo__erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
});
