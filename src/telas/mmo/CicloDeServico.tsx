import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Etiqueta, Pilula, Ramo, estiloDoSetor } from '../../ui';
import { Secao } from './Secao';
import type { BlocoSetor, EstagioVisual, FaseVisual } from './modelo';

function BlocoDeSetor({ bloco }: { bloco: BlocoSetor }) {
  return (
    <section className="bloco-setor" style={estiloDoSetor(bloco.setor.cor_token)} aria-label={`${bloco.setor.nome}, ${bloco.acoes.length} ${bloco.acoes.length === 1 ? 'ação' : 'ações'}`}>
      <h5 className="bloco-setor__nome">{bloco.setor.nome}</h5>
      <ul className="acoes">
        {bloco.acoes.map((a) => (
          <li key={a.acao.id} className="acao">
            <span className="acao__texto">{a.texto}</span>
            {a.condicional && (
              <>
                {' '}
                <Etiqueta variante="ifelse">IF/ELSE</Etiqueta>
              </>
            )}
            {a.whatsapp && (
              <>
                {' '}
                <Etiqueta variante="whatsapp">WhatsApp</Etiqueta>
              </>
            )}
            {a.condicional && (
              <div className="ramos">
                <Ramo sim rotulo={a.condicional.se_sim.rotulo} texto={a.condicional.se_sim.texto} />
                <Ramo sim={false} rotulo={a.condicional.se_nao.rotulo} texto={a.condicional.se_nao.texto} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Triagem por perfil e classificação do lead (Est. 02) e oportunidades (Est. 02 e 22): as ramificações que a V08 acrescenta. */
function Extras({ e }: { e: EstagioVisual }) {
  return (
    <>
      {e.perfis.length > 0 && (
        <section className="extra" aria-label="Triagem por perfil do cliente">
          <h5 className="extra__titulo">Triagem por perfil do cliente</h5>
          <ul className="extra__lista">
            {e.perfis.map((p) => (
              <li key={p.id}>
                <strong>{p.nome}.</strong> {p.criterios} <span className="extra__acao">Próxima ação: {p.proxima_acao}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {e.leads.length > 0 && (
        <section className="extra" aria-label="Classificação do lead">
          <h5 className="extra__titulo">Classificação do lead</h5>
          <ul className="extra__lista">
            {e.leads.map((l) => (
              <li key={l.id}>
                <strong>{l.nome}:</strong> {l.criterios.join('; ')}.
              </li>
            ))}
          </ul>
        </section>
      )}
      {e.oportunidades.length > 0 && (
        <section className="extra" aria-label="Oportunidades a identificar">
          <h5 className="extra__titulo">Oportunidades a identificar</h5>
          <ul className="extra__chips">
            {e.oportunidades.map((o) => (
              <li key={o.id}>{o.nome}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function PainelDoEstagio({ e }: { e: EstagioVisual }) {
  return (
    <div className="estagio">
      {e.estagio.descricao && <p className="estagio__descricao">{e.estagio.descricao}</p>}
      {e.blocos.map((b) => (
        <BlocoDeSetor key={b.setor.id} bloco={b} />
      ))}
      <Extras e={e} />
    </div>
  );
}

/** As 4 fases lado a lado com os 22 estágios em pílulas. Cada fase mantém um estágio aberto por vez (como no MMO_v01). */
export function CicloDeServico({ fases }: { fases: FaseVisual[] }) {
  const [abertas, setAbertas] = useState<Record<number, number | null>>({});
  const totalEstagios = fases.reduce((soma, f) => soma + f.estagios.length, 0);
  // A fase com um estágio aberto ganha o dobro da largura (o painel é longo); só vale em telas largas (ver mmo.css).
  const colunas = fases.map((f) => (abertas[f.fase.id] != null ? 'minmax(0, 2fr)' : 'minmax(0, 1fr)')).join(' ');
  return (
    <Secao titulo={`Ciclo de serviço em ${totalEstagios} estágios`} dica="Abra um estágio para ver o que cada setor faz nele. Cada fase mantém um estágio aberto por vez.">
      <div className="fases" style={{ '--colunas': colunas } as CSSProperties}>
        {fases.map(({ fase, estagios, totalAcoes }) => (
          <div key={fase.id} className="fase" role="group" aria-labelledby={`fase-${fase.id}`}>
            <h3 id={`fase-${fase.id}`} className="fase__titulo">
              <span className="fase__numero">{fase.id}</span>{' '}
              <span className="fase__nome">{fase.nome}</span>{' '}
              <span className="fase__resumo">
                {estagios.length} estágios, {totalAcoes} ações
              </span>
            </h3>
            <div className="fase__estagios">
              {estagios.map((e) => (
                <Pilula
                  key={e.estagio.id}
                  numero={e.numero}
                  nome={e.estagio.nome}
                  resumo={`${e.totalAcoes} ações`}
                  nivel={4}
                  aberta={abertas[fase.id] === e.estagio.id}
                  aoAlternar={(abrir) => setAbertas((atual) => ({ ...atual, [fase.id]: abrir ? e.estagio.id : null }))}
                >
                  <PainelDoEstagio e={e} />
                </Pilula>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Secao>
  );
}
