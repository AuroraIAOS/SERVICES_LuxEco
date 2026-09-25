import { useId, useState } from 'react';
import type { MatrizV08, Setor } from '../../dados/tipos';
import { raiasFase, raiasSetor } from '../../fluxograma/raias';
import { Botao, CampoSeletor } from '../../ui';

interface Gerado {
  titulo: string;
  svg: string;
  /** `revisao` das edições no momento em que foi gerado. */
  revisao: number;
}

/**
 * Fluxograma gerado das fichas (SVG de raias, decidido no spike 01.5): do setor escolhido ou geral de uma fase.
 * Nasce quando a pessoa pede — inclui as edições feitas até ali — e avisa quando as fichas mudaram depois.
 * O texto vai escapado pelo gerador (`esc`); o SVG entra na página como marcação, nunca como script.
 */
export function PainelFluxograma({ matriz, setor, faseSugerida, revisao }: { matriz: MatrizV08; setor: Setor; faseSugerida: number; revisao: number }) {
  const idTitulo = useId();
  const [gerado, setGerado] = useState<Gerado | null>(null);
  const [faseEscolhida, setFaseEscolhida] = useState<number | null>(null);
  const fase = faseEscolhida ?? faseSugerida;
  const nomeDaFase = matriz.fases.find((f) => f.id === fase)?.nome ?? '';

  const gerarSetor = () => setGerado({ titulo: `Fluxo do setor ${setor.nome}`, svg: raiasSetor(matriz, setor.id, { tema: 'escuro' }), revisao });
  const gerarFase = () => setGerado({ titulo: `Fluxo geral — Fase ${fase}: ${nomeDaFase}`, svg: raiasFase(matriz, fase, { tema: 'escuro' }), revisao });
  const desatualizado = gerado !== null && gerado.revisao !== revisao;

  return (
    <section className="fluxo-painel" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="fluxo-painel__titulo">
        Fluxograma
      </h2>
      <p className="fluxo-painel__dica">Gere o fluxograma a partir das fichas, com as suas edições: uma coluna por estágio e os dois caminhos de cada decisão.</p>
      <div className="fluxo-painel__acoes">
        <Botao variante="primario" onClick={gerarSetor}>
          {`Gerar fluxograma do setor ${setor.nome}`}
        </Botao>
        <div className="fluxo-painel__fase">
          <CampoSeletor
            rotulo="Fase do fluxograma geral"
            value={String(fase)}
            onChange={(e) => setFaseEscolhida(Number(e.target.value))}
            opcoes={matriz.fases.map((f) => ({ valor: String(f.id), rotulo: `${f.id}. ${f.nome}` }))}
          />
          <Botao onClick={gerarFase}>Gerar fluxograma geral da fase</Botao>
        </div>
      </div>

      {gerado && (
        <>
          <p role="status" className="fluxo-painel__estado">
            {desatualizado ? 'Você editou fichas depois de gerar este fluxograma. Gere de novo para incluir as edições.' : `Fluxograma gerado: ${gerado.titulo}.`}
          </p>
          <div className="fluxo" role="region" aria-label={gerado.titulo} tabIndex={0} dangerouslySetInnerHTML={{ __html: gerado.svg }} />
        </>
      )}
    </section>
  );
}
