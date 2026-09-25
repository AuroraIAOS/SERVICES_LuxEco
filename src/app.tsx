import type { ReactNode } from 'react';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { HashRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BotaoLink, Cabecalho, EstadoVazio, PularParaConteudo, Rodape, Tela } from './ui';
import type { ItemNavegacao } from './ui';

// Guia de estilo (#/guia): só no `npm run dev`. Em produção `import.meta.env.DEV` é falso e o módulo nem entra no build.
const Guia = import.meta.env.DEV ? lazy(() => import('./ui/Guia').then((m) => ({ default: m.Guia }))) : null;

interface DefinicaoTela extends ItemNavegacao {
  subtitulo: string;
  vazio: { titulo: string; texto: string; acoes?: { para: string; rotulo: string }[] };
}

// Placeholders: o MMO (02.8) e o FPE (02.9) trocam o corpo por telas reais em src/telas/; POP e Versões chegam na Etapa 03.
export const TELAS: readonly DefinicaoTela[] = [
  {
    caminho: '/mmo',
    rotulo: 'MMO v02',
    subtitulo: 'Mapa Mental Organizacional',
    vazio: { titulo: 'Mapa em construção', texto: 'O mapa dos 22 estágios e dos 12 setores aparece nesta tela.' },
  },
  {
    caminho: '/fpe',
    rotulo: 'FPE',
    subtitulo: 'Formulário 5W1H e fluxograma',
    vazio: { titulo: 'Formulário em construção', texto: 'As fichas 5W1H e o fluxograma de cada setor aparecem nesta tela.' },
  },
  {
    caminho: '/pop',
    rotulo: 'POP',
    subtitulo: 'Procedimentos Operacionais Padrão',
    vazio: {
      titulo: 'Tela prevista para a próxima versão',
      texto: 'Aqui você vai montar os Procedimentos Operacionais Padrão de cada setor. Até lá, use o mapa e o formulário.',
      acoes: [
        { para: '/mmo', rotulo: 'Abrir o MMO v02' },
        { para: '/fpe', rotulo: 'Abrir o FPE' },
      ],
    },
  },
  {
    caminho: '/versoes',
    rotulo: 'Versões salvas',
    subtitulo: 'Cópias de segurança guardadas no servidor',
    vazio: {
      titulo: 'Tela prevista para a próxima versão',
      texto: 'Aqui você vai listar, baixar e excluir as versões salvas no servidor.',
      acoes: [{ para: '/fpe', rotulo: 'Abrir o FPE' }],
    },
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
            <Route
              key={t.caminho}
              path={t.caminho}
              element={
                <Tela titulo={t.rotulo} subtitulo={t.subtitulo}>
                  <EstadoVazio
                    titulo={t.vazio.titulo}
                    texto={t.vazio.texto}
                    acao={t.vazio.acoes?.map((a) => (
                      <BotaoLink key={a.para} para={a.para}>
                        {a.rotulo}
                      </BotaoLink>
                    ))}
                  />
                </Tela>
              }
            />
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
