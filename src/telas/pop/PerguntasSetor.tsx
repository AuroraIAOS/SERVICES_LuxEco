import { useState } from 'react';
import type { PerguntaPop, PopTemplates, Setor } from '../../dados/tipos';
import type { EstadoPop } from '../../estado/pop';
import { MENSAGEM_FALLBACK } from '../../llm/fallback';
import { Botao, CampoAreaTexto, Cartao } from '../../ui';
import type { EstadoLlm } from './useLlm';

type Retorno = { tipo: 'carregando' } | { tipo: 'sugestao'; texto: string; modelo: string } | { tipo: 'aviso'; texto: string };

/**
 * Perguntas estratégicas do setor com a resposta-padrão pré-preenchida e editável. Cada digitação é guardada na hora
 * (`aoResponder`): trocar de setor ou gerar o POP nunca perde nada. Resposta apagada não entra no POP.
 * “Redigir com IA” só propõe: o texto sugerido aparece como texto puro e só entra na resposta se a pessoa aceitar.
 */
export function PerguntasSetor({
  setor,
  perguntas,
  templates,
  estado,
  llm,
  aoResponder,
  aoRestaurar,
}: {
  setor: Setor;
  perguntas: readonly PerguntaPop[];
  templates: PopTemplates;
  estado: EstadoPop;
  llm: EstadoLlm;
  aoResponder: (pergunta: PerguntaPop, texto: string) => void;
  aoRestaurar: (pergunta: PerguntaPop) => void;
}) {
  const [retornos, setRetornos] = useState<Record<string, Retorno | undefined>>({});
  const tituloDaSecao = new Map(templates.secoes.map((s) => [s.numero, s.titulo]));
  const doSetor = perguntas.filter((p) => p.setor_id === setor.id);
  const definir = (id: string, r: Retorno | undefined) => setRetornos((atual) => ({ ...atual, [id]: r }));

  const redigir = async (p: PerguntaPop, resposta: string) => {
    definir(p.id, { tipo: 'carregando' });
    const r = await llm.redigir({ pergunta: p.pergunta, resposta });
    if (r.origem === 'llm') definir(p.id, { tipo: 'sugestao', texto: r.texto, modelo: r.modelo ?? '' });
    else definir(p.id, { tipo: 'aviso', texto: MENSAGEM_FALLBACK[r.motivo ?? 'todos_falharam'] });
  };

  return (
    <Cartao titulo={`Perguntas estratégicas: ${setor.nome}`} setor={setor.cor_token} className="pop-perguntas">
      <p className="pop-perguntas__dica">
        Cada resposta já vem preenchida com o que os documentos da Lux dizem. Ajuste o que for diferente na prática: o que você escrever vai para o POP.
      </p>
      <ol className="pop-perguntas__lista">
        {doSetor.map((p) => {
          const editada = estado.pop_respostas[p.id];
          const valor = editada?.texto ?? p.resposta_padrao;
          const retorno = retornos[p.id];
          return (
            <li key={p.id} className="pop-pergunta">
              <CampoAreaTexto
                rotulo={p.pergunta}
                ajuda={`Vai para a seção ${p.secao}: ${tituloDaSecao.get(p.secao) ?? ''}.`}
                erro={valor.trim() === '' ? 'Sem resposta: esta pergunta não entra no POP.' : undefined}
                rows={4}
                value={valor}
                onChange={(e) => aoResponder(p, e.target.value)}
              />
              <div className="pop-pergunta__acoes">
                <Botao variante="discreto" disabled={!editada} aria-label={`Restaurar a resposta-padrão: ${p.pergunta}`} onClick={() => aoRestaurar(p)}>
                  Restaurar resposta-padrão
                </Botao>
                {llm.ambiente.llmDisponivel && (
                  <Botao variante="discreto" disabled={retorno?.tipo === 'carregando' || valor.trim() === ''} aria-label={`Redigir com IA: ${p.pergunta}`} onClick={() => void redigir(p, valor)}>
                    Redigir com IA
                  </Botao>
                )}
              </div>
              {retorno?.tipo === 'carregando' && (
                <p role="status" className="pop-aviso">
                  Redigindo…
                </p>
              )}
              {retorno?.tipo === 'aviso' && (
                <p role="status" className="pop-aviso">
                  {retorno.texto}
                </p>
              )}
              {retorno?.tipo === 'sugestao' && (
                <div className="pop-sugestao" role="group" aria-label={`Sugestão da IA: ${p.pergunta}`}>
                  <p className="pop-sugestao__titulo">Sugestão da IA{retorno.modelo ? ` (${retorno.modelo})` : ''}</p>
                  <p className="pop-sugestao__texto">{retorno.texto}</p>
                  <div className="pop-pergunta__acoes">
                    <Botao
                      variante="primario"
                      onClick={() => {
                        aoResponder(p, retorno.texto);
                        definir(p.id, undefined);
                      }}
                    >
                      Usar esta redação
                    </Botao>
                    <Botao variante="discreto" onClick={() => definir(p.id, undefined)}>
                      Descartar
                    </Botao>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Cartao>
  );
}
