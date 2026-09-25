import { useId } from 'react';
import { Etiqueta, estiloDoSetor } from '../../ui';
import type { Fpe, Selecao } from './modelo';

/** Texto só para leitor de tela (a contagem “29” vira “29 fichas”). */
const SoLeitor = ({ children }: { children: string }) => <span className="so-leitor">{children}</span>;

/**
 * Navegação setor → estágio → ficha. Três grupos de botões; o item escolhido leva aria-current.
 * Trocar de setor ou estágio não perde nada: as edições já estão guardadas.
 */
export function NavegacaoFpe({ fpe, selecao, aoSelecionar }: { fpe: Fpe; selecao: Selecao; aoSelecionar: (proxima: Partial<Selecao>) => void }) {
  const idSetor = useId();
  const idEstagio = useId();
  const idFicha = useId();
  const setor = fpe.setores.find((s) => s.setor.id === selecao.setorId);
  const estagio = setor?.estagios.find((e) => e.estagio.id === selecao.estagioId);
  return (
    <nav className="fpe-nav" aria-label="Escolha da ficha">
      <div role="group" aria-labelledby={idSetor}>
        <p id={idSetor} className="fpe-nav__titulo">
          Setor
        </p>
        <ul className="chips">
          {fpe.setores.map((s) => (
            <li key={s.setor.id}>
              <button
                type="button"
                className="chip chip--setor"
                style={estiloDoSetor(s.setor.cor_token)}
                aria-current={s.setor.id === selecao.setorId ? 'true' : undefined}
                onClick={() => aoSelecionar({ setorId: s.setor.id })}
              >
                <span className="chip__nome">{s.setor.nome}</span>{' '}
                <span className="chip__contagem">
                  {s.totalFichas}
                  <SoLeitor> fichas</SoLeitor>
                </span>
                {s.totalEditadas > 0 && (
                  <>
                    {' '}
                    <span className="chip__editadas">
                      <span aria-hidden="true">{s.totalEditadas}</span>
                      <SoLeitor>{`${s.totalEditadas} editadas`}</SoLeitor>
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {setor && (
        <div role="group" aria-labelledby={idEstagio}>
          <p id={idEstagio} className="fpe-nav__titulo">
            Estágio
          </p>
          <ul className="chips">
            {setor.estagios.map((e) => (
              <li key={e.estagio.id}>
                <button type="button" className="chip" aria-current={e.estagio.id === selecao.estagioId ? 'true' : undefined} onClick={() => aoSelecionar({ setorId: setor.setor.id, estagioId: e.estagio.id })}>
                  <span className="chip__numero">{e.numero}</span> <span className="chip__nome">{e.estagio.nome}</span>{' '}
                  <span className="chip__contagem">
                    {e.fichas.length}
                    <SoLeitor> fichas</SoLeitor>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {estagio && (
        <div role="group" aria-labelledby={idFicha}>
          <p id={idFicha} className="fpe-nav__titulo">
            Fichas do estágio
          </p>
          <ul className="fichas-lista">
            {estagio.fichas.map((f) => (
              <li key={f.ficha.id}>
                <button
                  type="button"
                  className="ficha-item"
                  aria-current={f.ficha.id === selecao.fichaId ? 'true' : undefined}
                  onClick={() => aoSelecionar({ setorId: selecao.setorId, estagioId: selecao.estagioId, fichaId: f.ficha.id })}
                >
                  <span className="ficha-item__texto">{f.valores.what}</span>
                  {f.ifElse && (
                    <>
                      {' '}
                      <Etiqueta variante="ifelse">IF/ELSE</Etiqueta>
                    </>
                  )}
                  {f.editada && (
                    <>
                      {' '}
                      <Etiqueta>Editada</Etiqueta>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
