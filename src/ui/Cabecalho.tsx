import { Link, NavLink } from 'react-router-dom';
import { Marca, SeloSol } from './Marca';

export interface ItemNavegacao {
  caminho: string;
  rotulo: string;
}

/** Barra fixa: marca à esquerda, telas à direita. A tela ativa recebe aria-current="page" (NavLink). */
export function Cabecalho({ itens }: { itens: readonly ItemNavegacao[] }) {
  const inicio = itens[0]?.caminho ?? '/';
  return (
    <header className="cabecalho">
      <div className="cabecalho__interno">
        <Link to={inicio} className="cabecalho__marca">
          <SeloSol />
          <Marca />
        </Link>
        <nav aria-label="Telas" className="cabecalho__nav">
          <ul>
            {itens.map((item) => (
              <li key={item.caminho}>
                <NavLink to={item.caminho}>{item.rotulo}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
