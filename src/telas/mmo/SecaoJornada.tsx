import type { JornadaEtapa } from '../../dados/tipos';
import { Secao } from './Secao';

/** A jornada na perspectiva do cliente: uma sequência de verdade, então a lista é numerada. */
export function SecaoJornada({ etapas }: { etapas: JornadaEtapa[] }) {
  return (
    <Secao titulo={`Jornada do cliente em ${etapas.length} fases`} dica="Como o cliente vive o ciclo de serviço, do primeiro contato ao pós-venda.">
      <ol className="jornada">
        {etapas.map((etapa, i) => (
          <li key={etapa.id}>
            <span className="jornada__numero" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <strong className="jornada__nome">{etapa.nome}</strong>
            <span className="jornada__descricao">{etapa.descricao}</span>
          </li>
        ))}
      </ol>
    </Secao>
  );
}
