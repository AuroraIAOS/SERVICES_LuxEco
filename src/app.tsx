import type { ReactNode } from 'react';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { HashRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TelaMmo } from './telas/mmo';
import { Cabecalho, PularParaConteudo, Rodape, Tela } from './ui';
import type { ItemNavegacao } from './ui';

// Guia de estilo (#/guia): só no `npm run dev`. Em produção `import.meta.env.DEV` é falso e o módulo nem entra no build.
// FPE: as 236 fichas (~280 kB de JSON) só carregam quando a tela é aberta.
const TelaFpe = lazy(() => import('./telas/fpe').then((m) => ({ default: m.TelaFpe })));

// POP: fichas, bibliotecas e perguntas (~400 kB de JSON) só carregam quando a tela é aberta.
const TelaPop = lazy(() => import('./telas/pop').then((m) => ({ default: m.TelaPop })));

// Versões salvas: só carrega o cliente da API, o modelo e as regras de restauração quando a tela é aberta.
const TelaVersoes = lazy(() => import('./telas/versoes').then((m) => ({ default: m.TelaVersoes })));

const Guia = import.meta.env.DEV ? lazy(() => import('./ui/Guia').then((m) => ({ default: m.Guia }))) : null;

interface DefinicaoTela extends ItemNavegacao {
  /** o que a rota mostra. */
  tela: () => ReactNode;
}

export const TELAS: readonly DefinicaoTela[] = [
  { caminho: '/mmo', rotulo: 'MMO', tela: () => <TelaMmo /> },
  {
    caminho: '/fpe',
    rotulo: 'FPE',
    tela: () => (
      <Suspense
        fallback={
          <Tela titulo="FPE" subtitulo="Formulário 5W1H e fluxograma">
            <p role="status">Carregando as fichas…</p>
          </Tela>
        }
      >
        <TelaFpe />
      </Suspense>
    ),
  },
  {
    caminho: '/pop',
    rotulo: 'POP',
    tela: () => (
      <Suspense
        fallback={
          <Tela titulo="POP" subtitulo="Procedimentos Operacionais Padrão">
            <p role="status">Carregando o POP…</p>
          </Tela>
        }
      >
        <TelaPop />
      </Suspense>
    ),
  },
  {
    caminho: '/versoes',
    rotulo: 'Versões salvas',
    tela: () => (
      <Suspense
        fallback={
          <Tela titulo="Versões salvas" subtitulo="Cópias de segurança guardadas no servidor">
            <p role="status">Carregando as versões…</p>
          </Tela>
        }
      >
        <TelaVersoes />
      </Suspense>
    ),
  },
];

const ITENS_NAVEGACAO: readonly ItemNavegacao[] = TELAS.map(({ caminho, rotulo }) => ({ caminho, rotulo }));

export function Rotas() {
  const { pathname } = useLocation();
  const principal = useRef<HTMLElement>(null);
  const primeira = useRef(true);

  // Ao trocar de tela, o foco vai para o conteúdo: quem usa teclado ou leitor de tela não fica preso na navegação.
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    principal.current?.focus();
  }, [pathname]);

  return (
    <>
      <PularParaConteudo />
      <Cabecalho itens={ITENS_NAVEGACAO} />
      <main id="conteudo" ref={principal} tabIndex={-1} className="conteudo">
        <Routes>
          <Route path="/" element={<Navigate to="/mmo" replace />} />
          {TELAS.map((t) => (
            <Route key={t.caminho} path={t.caminho} element={t.tela()} />
          ))}
          {Guia && (
            <Route
              path="/guia"
              element={
                <Suspense fallback={null}>
                  <Guia />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<Navigate to="/mmo" replace />} />
        </Routes>
      </main>
      <Rodape />
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
