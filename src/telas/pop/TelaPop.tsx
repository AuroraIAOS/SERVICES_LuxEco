import { useEffect, useMemo, useRef, useState } from 'react';
import { BIBLIOTECAS } from '../../dados/bibliotecas';
import { DOCUMENTO_FICHAS } from '../../dados/fichas';
import { MATRIZ_V08 } from '../../dados/matriz';
import { PERGUNTAS_POP, POP_OBSERVACOES, POP_TEMPLATES } from '../../dados/pop';
import type { Bibliotecas, DocumentoFichas, DocumentoPerguntasPop, MatrizV08, ObservacoesJuridicasPop, PopTemplates } from '../../dados/tipos';
import type { ArmazenamentoTexto } from '../../estado/armazenamento';
import { lerEstadoFpe } from '../../estado/armazenamento';
import { respostasDoEstado } from '../../estado/pop';
import type { EstadoPop } from '../../estado/pop';
import type { EscopoPop, Pop } from '../../pop/gerar';
import { gerarPop } from '../../pop/gerar';
import type { Ambiente } from '../../llm/ambiente';
import { Botao, Numeros, Pilula, Tela, estiloDoSetor } from '../../ui';
import { montarFpe } from '../fpe/modelo';
import { PainelExportacaoPop } from './PainelExportacaoPop';
import { SalvarVersao } from '../comum/SalvarVersao';
import { PainelLimiteGasto } from './PainelLimiteGasto';
import { PerguntasSetor } from './PerguntasSetor';
import { SeletorLlm } from './SeletorLlm';
import { useLlm } from './useLlm';
import { PopGerado } from './PopGerado';
import { useEstadoPop } from './useEstadoPop';

interface Gerado {
  pop: Pop;
  /** o estado das respostas no momento de gerar: se mudar depois, o POP fica “desatualizado”. */
  estado: EstadoPop;
}

/**
 * POP (03.1): escolher o setor, revisar as perguntas estratégicas (resposta-padrão pré-preenchida e editável) e gerar o
 * POP do setor ou o POP geral por template, sem LLM. As fichas usadas são as do FPE com as edições em vigor.
 * As props existem para os testes; a tela real usa os JSON versionados e o localStorage.
 */
export function TelaPop({
  dados = MATRIZ_V08,
  fichas = DOCUMENTO_FICHAS,
  bibliotecas = BIBLIOTECAS,
  perguntas = PERGUNTAS_POP,
  templates = POP_TEMPLATES,
  observacoes = POP_OBSERVACOES,
  armazenamento,
  armazenamentoFpe,
  ambienteLlm,
  fetchLlm,
  fetchServidor,
}: {
  dados?: MatrizV08;
  fichas?: DocumentoFichas;
  bibliotecas?: Bibliotecas;
  perguntas?: DocumentoPerguntasPop;
  templates?: PopTemplates;
  observacoes?: ObservacoesJuridicasPop;
  armazenamento?: ArmazenamentoTexto | null;
  /** onde ler as edições do FPE; `undefined` = o mesmo do POP. */
  armazenamentoFpe?: ArmazenamentoTexto | null;
  /** só nos testes: ambiente e `fetch` da IA (a tela real lê o .env do build e usa o fetch do navegador). */
  ambienteLlm?: Ambiente;
  fetchLlm?: typeof fetch;
  /** só nos testes: o `fetch` da API de backups (config_llm). */
  fetchServidor?: typeof fetch;
}) {
  const { estado, persistindo, responder, restaurar } = useEstadoPop(armazenamento);
  const llm = useLlm({ armazenamento, ambiente: ambienteLlm, fetchFn: fetchLlm, fetchServidor });
  // As edições do FPE são lidas ao abrir a tela: quem edita uma ficha e volta ao POP já as vê no procedimento.
  const [edicoesFpe] = useState(() => lerEstadoFpe(armazenamentoFpe === undefined ? armazenamento : armazenamentoFpe).estado);
  const fpe = useMemo(() => montarFpe(dados, fichas, edicoesFpe), [dados, fichas, edicoesFpe]);
  const [setorId, setSetorId] = useState(dados.setores[0]?.id ?? '');
  const [gerado, setGerado] = useState<Gerado | null>(null);
  const resultado = useRef<HTMLDivElement>(null);
  const setor = dados.setores.find((s) => s.id === setorId);

  const gerar = (escopo: EscopoPop) => {
    setGerado({ pop: gerarPop(escopo, { v08: dados, fpe, bibliotecas, perguntas: perguntas.perguntas, templates, observacoes, respostas: respostasDoEstado(estado) }), estado });
  };

  // O POP gerado aparece abaixo das perguntas: leva o foco até ele (teclado e leitor de tela).
  const pop = gerado?.pop;
  useEffect(() => {
    if (pop) resultado.current?.focus();
  }, [pop]);

  const totalEditadas = Object.keys(estado.pop_respostas).length;

  return (
    <Tela
      titulo="POP"
      subtitulo="Procedimentos Operacionais Padrão"
      resumo={
        <Numeros
          itens={[
            { valor: dados.setores.length, rotulo: 'setores' },
            { valor: perguntas.perguntas.length, rotulo: 'perguntas' },
            { valor: templates.secoes.length, rotulo: 'seções por POP' },
            { valor: totalEditadas, rotulo: totalEditadas === 1 ? 'resposta editada' : 'respostas editadas' },
          ]}
        />
      }
    >
      {!persistindo && (
        <p role="status" className="fpe-aviso">
          Este navegador não deixou guardar as suas respostas. Elas valem só até você fechar a página.
        </p>
      )}

      <nav className="fpe-nav" aria-label="Escolha do setor">
        <div role="group" aria-labelledby="pop-setor-titulo">
          <p id="pop-setor-titulo" className="fpe-nav__titulo">
            Setor
          </p>
          <ul className="grade-setores">
            {dados.setores.map((s) => (
              <li key={s.id}>
                <button type="button" className="chip chip--setor" style={estiloDoSetor(s.cor_token)} aria-current={s.id === setorId ? 'true' : undefined} onClick={() => setSetorId(s.id)}>
                  <span className="chip__nome">{s.nome}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {setor && <PerguntasSetor setor={setor} perguntas={perguntas.perguntas} templates={templates} estado={estado} llm={llm} aoResponder={(p, texto) => responder(p.id, p.resposta_padrao, texto)} aoRestaurar={(p) => restaurar(p.id)} />}

      {llm.ambiente.llmDisponivel && (
        <div className="pop-llm">
          <Pilula nome="IA (opcional)" resumo="o POP sai igual sem ela" nivel={2}>
            <div className="pop-secao pop-llm__quadro">
              <section className="pop-llm__bloco" aria-labelledby="pop-llm-redacao">
                <h3 id="pop-llm-redacao" className="pop-llm__subtitulo">
                  Redação com IA
                </h3>
                <SeletorLlm llm={llm} />
              </section>
              <section className="pop-llm__bloco" aria-labelledby="pop-llm-limite">
                <h3 id="pop-llm-limite" className="pop-llm__subtitulo">
                  Limite de gasto da IA
                </h3>
                <PainelLimiteGasto llm={llm} />
              </section>
            </div>
          </Pilula>
        </div>
      )}

      <div className="pop-acoes">
        <Botao variante="primario" disabled={!setor} onClick={() => setor && gerar({ tipo: 'setor', setorId: setor.id })}>
          {`Gerar POP do setor ${setor?.nome ?? ''}`.trim()}
        </Botao>
        <Botao variante="secundario" onClick={() => gerar({ tipo: 'geral' })}>
          Gerar POP geral
        </Botao>
      </div>

      <SalvarVersao escopoPadrao="pop" estadoFpe={edicoesFpe} estadoPop={estado} />

      <div ref={resultado} tabIndex={-1} className="pop-resultado">
        {gerado ? (
          <>
            <PopGerado pop={gerado.pop} desatualizado={gerado.estado !== estado} />
            <PainelExportacaoPop pop={gerado.pop} estadoFpe={edicoesFpe} estadoPop={estado} />
          </>
        ) : (
          <p className="pop-resultado__vazio">O POP gerado aparece aqui, com as {templates.secoes.length} seções.</p>
        )}
      </div>
    </Tela>
  );
}
