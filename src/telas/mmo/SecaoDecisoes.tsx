import { useId } from 'react';
import { Ramo, estiloDoSetor } from '../../ui';
import { Secao } from './Secao';
import type { DecisaoVisual, Mmo } from './modelo';

function Decisao({ d }: { d: DecisaoVisual }) {
  const id = useId();
  return (
    <article className="decisao" style={estiloDoSetor(d.setorCor)} aria-labelledby={id}>
      <p className="decisao__onde">
        {d.estagiosTexto}, {d.setorNome}
      </p>
      <h4 id={id} className="decisao__pergunta">
        {d.pergunta}
      </h4>
      <Ramo sim rotulo={d.sim.rotulo} texto={d.sim.texto} />
      <Ramo sim={false} rotulo={d.nao.rotulo} texto={d.nao.texto} />
    </article>
  );
}

/** Todas as decisões IF/ELSE: as 15 situações do Mapa e as do atendimento e do pós-venda. Cada uma com seus dois caminhos. */
export function SecaoDecisoes({ decisoes }: { decisoes: Mmo['decisoes'] }) {
  const total = decisoes.situacoes.length + decisoes.atendimento.length;
  return (
    <Secao titulo="Decisões IF/ELSE" dica={`${total} decisões com dois caminhos cada: ${decisoes.situacoes.length} situações do mapa e ${decisoes.atendimento.length} do atendimento e do pós-venda.`}>
      <h3 className="grupo-titulo">Situações do mapa</h3>
      <div className="decisoes-grade">
        {decisoes.situacoes.map((d) => (
          <Decisao key={d.chave} d={d} />
        ))}
      </div>
      <h3 className="grupo-titulo">No atendimento e no pós-venda</h3>
      <div className="decisoes-grade">
        {decisoes.atendimento.map((d) => (
          <Decisao key={d.chave} d={d} />
        ))}
      </div>
    </Secao>
  );
}
