import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Hero } from './Hero';
import { NOME_MARCA } from './identidade';

/** Primeiro item da tabulação: leva direto ao conteúdo, sem passar pela navegação. Só aparece com o foco. */
export function PularParaConteudo({ alvo = 'conteudo' }: { alvo?: string }) {
  return (
    <a className="pular" href={`#${alvo}`} onClick={(e) => {
      // HashRouter usa o hash para as rotas: em vez de navegar, foca o <main>.
      e.preventDefault();
      document.getElementById(alvo)?.focus();
    }}>
      Pular para o conteúdo
    </a>
  );
}

/** Moldura de uma tela: título da aba do navegador + hero + corpo. */
export function Tela({ titulo, subtitulo, resumo, children }: { titulo: string; subtitulo?: string; resumo?: ReactNode; children?: ReactNode }) {
  useEffect(() => {
    document.title = `${titulo} — ${NOME_MARCA}`;
  }, [titulo]);
  return (
    <>
      <Hero titulo={titulo} subtitulo={subtitulo}>
        {resumo}
      </Hero>
      <div className="tela__corpo">{children}</div>
    </>
  );
}
