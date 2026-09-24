import { HashRouter, MemoryRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

// Placeholders da fundação (01.3). As telas reais nascem em src/telas/ só depois do portão 01→02.
const ROTAS = [
  { caminho: '/mmo', rotulo: 'MMO v02', texto: 'Mapa Mental Organizacional — em construção (subetapa 02.8).' },
  { caminho: '/fpe', rotulo: 'FPE', texto: 'Formulário 5W1H e fluxograma — em construção (subetapa 02.9).' },
  { caminho: '/pop', rotulo: 'POP', texto: 'Procedimentos Operacionais Padrão — em construção (Etapa 03).' },
  { caminho: '/versoes', rotulo: 'Versões salvas', texto: 'Gestão dos backups no servidor — em construção (subetapa 03.6).' },
] as const;

function Placeholder({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section>
      <h1>{titulo}</h1>
      <p>{texto}</p>
    </section>
  );
}

export function Rotas() {
  return (
    <>
      <header className="cabecalho">
        <span className="marca">
          LUX ECO <strong>SOLUTIONS</strong>
        </span>
        <nav aria-label="Telas">
          {ROTAS.map((r) => (
            <NavLink key={r.caminho} to={r.caminho}>
              {r.rotulo}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Navigate to="/mmo" replace />} />
          {ROTAS.map((r) => (
            <Route key={r.caminho} path={r.caminho} element={<Placeholder titulo={r.rotulo} texto={r.texto} />} />
          ))}
          <Route path="*" element={<Navigate to="/mmo" replace />} />
        </Routes>
      </main>
    </>
  );
}

// HashRouter: funciona em hospedagem estática sem regra de rewrite (#/mmo, #/fpe, #/pop, #/versoes).
export function App() {
  return (
    <HashRouter>
      <Rotas />
    </HashRouter>
  );
}

// Usado só nos testes (não depende de window.location).
export function AppEmMemoria({ inicial, children }: { inicial: string; children?: ReactNode }) {
  return (
    <MemoryRouter initialEntries={[inicial]}>
      <Rotas />
      {children}
    </MemoryRouter>
  );
}
