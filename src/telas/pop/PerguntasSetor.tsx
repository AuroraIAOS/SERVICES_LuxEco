import type { PerguntaPop, PopTemplates, Setor } from '../../dados/tipos';
import type { EstadoPop } from '../../estado/pop';
import { Botao, CampoAreaTexto, Cartao } from '../../ui';

/**
 * Perguntas estratégicas do setor com a resposta-padrão pré-preenchida e editável. Cada digitação é guardada na hora
 * (`aoResponder`): trocar de setor ou gerar o POP nunca perde nada. Resposta apagada não entra no POP.
 */
export function PerguntasSetor({
  setor,
  perguntas,
  templates,
  estado,
  aoResponder,
  aoRestaurar,
}: {
  setor: Setor;
  perguntas: readonly PerguntaPop[];
  templates: PopTemplates;
  estado: EstadoPop;
  aoResponder: (pergunta: PerguntaPop, texto: string) => void;
  aoRestaurar: (pergunta: PerguntaPop) => void;
}) {
  const tituloDaSecao = new Map(templates.secoes.map((s) => [s.numero, s.titulo]));
  const doSetor = perguntas.filter((p) => p.setor_id === setor.id);
  return (
    <Cartao titulo={`Perguntas estratégicas: ${setor.nome}`} setor={setor.cor_token} className="pop-perguntas">
      <p className="pop-perguntas__dica">
        Cada resposta já vem preenchida com o que os documentos da Lux dizem. Ajuste o que for diferente na prática: o que você escrever vai para o POP.
      </p>
      <ol className="pop-perguntas__lista">
        {doSetor.map((p) => {
          const editada = estado.pop_respostas[p.id];
          const valor = editada?.texto ?? p.resposta_padrao;
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
              <Botao variante="discreto" disabled={!editada} aria-label={`Restaurar a resposta-padrão: ${p.pergunta}`} onClick={() => aoRestaurar(p)}>
                Restaurar resposta-padrão
              </Botao>
            </li>
          );
        })}
      </ol>
    </Cartao>
  );
}
