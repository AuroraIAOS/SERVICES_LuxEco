import { useId, useState } from 'react';
import type { MatrizV08, Setor } from '../../dados/tipos';
import { baixar, MIME, nomeArquivo } from '../../exportar/baixar';
import { exportarMermaidFase, exportarMermaidSetor } from '../../exportar/mermaid';
import { htmlFluxo, imprimir } from '../../exportar/pdf';
import { raiasFase, raiasSetor } from '../../fluxograma/raias';
import { Botao, BotaoExportar, CampoSeletor } from '../../ui';

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

  // Exportar não depende de “Gerar”: sai da Matriz com as edições de agora. O PDF usa o tema claro (papel branco).
  const dataBR = (d: Date) => d.toLocaleDateString('pt-BR');
  const nomeFluxoFase = `geral-fase${fase}`;
  const mermaidDoSetor = () => {
    const agora = new Date();
    baixar(nomeArquivo(setor.nome, 'mermaid', agora), exportarMermaidSetor(matriz, setor.id, agora), MIME.mermaid);
  };
  const mermaidDaFase = () => {
    const agora = new Date();
    baixar(nomeArquivo(nomeFluxoFase, 'mermaid', agora), exportarMermaidFase(matriz, fase, agora), MIME.mermaid);
  };
  const pdfDoSetor = () => {
    const agora = new Date();
    imprimir(htmlFluxo(`Fluxo do setor ${setor.nome}`, raiasSetor(matriz, setor.id, { tema: 'claro' }), dataBR(agora)), 'a3', nomeArquivo(setor.nome, 'pdf', agora).replace(/\.pdf$/, ''));
  };
  const pdfDaFase = () => {
    const agora = new Date();
    imprimir(
      htmlFluxo(`Fluxo geral — Fase ${fase}: ${nomeDaFase}`, raiasFase(matriz, fase, { tema: 'claro' }), dataBR(agora)),
      'a3',
      nomeArquivo(nomeFluxoFase, 'pdf', agora).replace(/\.pdf$/, ''),
    );
  };

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

      <div className="fluxo-painel__exportar">
        <div role="group" aria-label="Exportar o fluxo do setor" className="exportacao__grupo">
          <p className="exportacao__rotulo">{`Exportar o fluxo do setor ${setor.nome}`}</p>
          <div className="exportacao__botoes">
            <BotaoExportar formato="mermaid" escopo={`fluxo do setor ${setor.nome}`} onExportar={mermaidDoSetor} />
            <BotaoExportar formato="pdf" escopo={`fluxo do setor ${setor.nome}`} onExportar={pdfDoSetor} />
          </div>
        </div>
        <div role="group" aria-label="Exportar o fluxo geral da fase" className="exportacao__grupo">
          <p className="exportacao__rotulo">{`Exportar o fluxo geral da Fase ${fase}`}</p>
          <div className="exportacao__botoes">
            <BotaoExportar formato="mermaid" escopo={`fluxo geral da Fase ${fase}`} onExportar={mermaidDaFase} />
            <BotaoExportar formato="pdf" escopo={`fluxo geral da Fase ${fase}`} onExportar={pdfDaFase} />
          </div>
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
