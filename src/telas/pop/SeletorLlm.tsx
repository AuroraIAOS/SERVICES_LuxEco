import { useId } from 'react';
import { CampoMarcacao, CampoTexto } from '../../ui';
import type { EstadoLlm } from './useLlm';

/**
 * Redação com IA: LLM padrão (chave da Lux Eco, modelos :free) ou LLM particular (chave do contratante, só na memória desta página),
 * e o aviso com a ciência de envio a um provedor externo. Sem a ciência, nenhuma chamada sai.
 */
export function SeletorLlm({ llm }: { llm: EstadoLlm }) {
  const idGrupo = useId();
  if (!llm.ambiente.llmDisponivel) {
    return (
      <p role="status" className="pop-aviso">
        A redação com IA não está disponível nesta versão do arquivo. O POP sai normalmente, pelo template.
      </p>
    );
  }
  return (
    <div className="llm-seletor">
      <div role="radiogroup" aria-labelledby={idGrupo} className="llm-seletor__modo">
        <p id={idGrupo} className="fpe-nav__titulo">
          Qual IA usar
        </p>
        <CampoMarcacao tipo="radio" name="llm-modo" rotulo="LLM padrão (gratuito, com a chave da ferramenta)" checked={llm.modo === 'padrao'} onChange={() => llm.mudarModo('padrao')} />
        <CampoMarcacao tipo="radio" name="llm-modo" rotulo="LLM particular (com a minha chave)" checked={llm.modo === 'particular'} onChange={() => llm.mudarModo('particular')} />
      </div>

      {llm.modo === 'padrao' && llm.ambiente.chave === '' && (
        <p role="status" className="pop-aviso">
          Não há chave da IA padrão configurada nesta versão. Use a IA particular ou siga só com o template.
        </p>
      )}

      {llm.modo === 'particular' && (
        <div className="llm-seletor__particular">
          <CampoTexto
            rotulo="Chave da API"
            ajuda="Fica só na memória desta página: ao fechar ou recarregar, ela some. Nunca é gravada nem enviada para o servidor da ferramenta."
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={llm.chaveParticular}
            onChange={(e) => llm.mudarChaveParticular(e.target.value)}
          />
          <CampoTexto rotulo="Modelo" ajuda="O nome do modelo da sua conta, como o provedor informa (ex.: provedor/modelo)." spellCheck={false} value={llm.modeloParticular} onChange={(e) => llm.mudarModeloParticular(e.target.value)} />
          <CampoTexto
            rotulo="Endereço da API (opcional)"
            ajuda="Deixe em branco para usar o OpenRouter. Só endereços que começam com https:// são aceitos."
            spellCheck={false}
            value={llm.urlParticular}
            onChange={(e) => llm.mudarUrlParticular(e.target.value)}
          />
        </div>
      )}

      <div className="pop-aviso llm-seletor__aviso" role="note">
        <p>
          <strong>Atenção:</strong> ao usar a IA, o texto da pergunta e da resposta será enviado a um provedor externo (OpenRouter ou o da sua chave). Não escreva dados de clientes nas respostas. A IA só reescreve o que você já tem: se ela
          acrescentar número, prazo ou valor, o texto é descartado.
        </p>
        <CampoMarcacao rotulo="Entendo que o texto será enviado a um provedor externo e quero usar a IA." checked={llm.consentimento} onChange={(e) => llm.mudarConsentimento(e.target.checked)} />
      </div>
    </div>
  );
}
