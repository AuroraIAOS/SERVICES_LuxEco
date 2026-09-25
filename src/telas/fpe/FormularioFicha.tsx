import { useId } from 'react';
import { useForm } from 'react-hook-form';
import type { CampoFicha, ValoresFicha } from '../../estado/armazenamento';
import { CAMPOS_FICHA } from '../../estado/armazenamento';
import { Botao, CampoAreaTexto, Etiqueta } from '../../ui';
import type { EstagioFpe, FichaVisual, SetorFpe } from './modelo';
import { CAMPOS } from './modelo';

/** Campos que cabem lado a lado em telas largas (curtos); os demais ocupam a linha toda. */
const CURTOS: readonly CampoFicha[] = ['where', 'when', 'who'];

/**
 * Formulário 5W1H de uma ficha, com o valor em vigor (padrão + edições). Cada digitação é guardada na hora
 * (aoEditar) — trocar de setor, estágio ou ficha nunca perde nada. Campo vazio mostra o que falta, mas o dado fica.
 * Use `key={ficha.id}`: a ficha nova monta um formulário novo.
 */
export function FormularioFicha({
  setor,
  estagio,
  ficha,
  aoEditar,
  aoRestaurar,
}: {
  setor: SetorFpe['setor'];
  estagio: EstagioFpe['estagio'];
  ficha: FichaVisual;
  aoEditar: (campo: CampoFicha, valor: string) => void;
  aoRestaurar: () => void;
}) {
  const idTitulo = useId();
  const {
    register,
    reset,
    formState: { errors },
  } = useForm<ValoresFicha>({ defaultValues: ficha.valores, mode: 'onChange' });

  return (
    <form className="ficha-form" aria-labelledby={idTitulo} noValidate onSubmit={(e) => e.preventDefault()}>
      <div className="ficha-form__cabecalho">
        <div>
          <h2 id={idTitulo} className="ficha-form__titulo">
            Ficha 5W1H
          </h2>
          <p className="ficha-form__contexto">
            {setor.nome}, Est. {String(estagio.numero).padStart(2, '0')} {estagio.nome}
            {ficha.ifElse && (
              <>
                {' '}
                <Etiqueta variante="ifelse">IF/ELSE</Etiqueta>
              </>
            )}
            {ficha.editada && (
              <>
                {' '}
                <Etiqueta>Editada</Etiqueta>
              </>
            )}
          </p>
        </div>
        <Botao
          variante="discreto"
          disabled={!ficha.editada}
          aria-label={`Restaurar o padrão da ficha: ${ficha.padrao.what}`}
          onClick={() => {
            reset(ficha.padrao);
            aoRestaurar();
          }}
        >
          Restaurar padrão
        </Botao>
      </div>

      <div className="ficha-form__campos">
        {CAMPOS_FICHA.map((campo) => (
          <div key={campo} className={CURTOS.includes(campo) ? 'ficha-form__curto' : 'ficha-form__longo'}>
            <CampoAreaTexto
              rotulo={CAMPOS[campo].rotulo}
              ajuda={CAMPOS[campo].ajuda}
              rows={CAMPOS[campo].linhas}
              obrigatorio
              erro={errors[campo]?.message}
              {...register(campo, {
                validate: (valor) => valor.trim() !== '' || CAMPOS[campo].erro,
                onChange: (e: { target: { value: string } }) => aoEditar(campo, e.target.value),
              })}
            />
          </div>
        ))}
      </div>
    </form>
  );
}
