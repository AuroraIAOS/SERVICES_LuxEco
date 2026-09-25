import { useEffect, useState } from 'react';
import type { ConfigLlm } from '../../llm/config';
import { normalizarModelos } from '../../llm/config';
import type { ErrosDeConfig, PedidoDeConfig } from '../../llm/limite_gasto';
import { aplicarPedidoDeConfig, nivelDeAlerta, numeroDoCampo, percentualDoTeto, usoDeHoje } from '../../llm/limite_gasto';
import { Botao, CampoMarcacao, CampoTexto } from '../../ui';
import type { EstadoLlm } from './useLlm';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const texto = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));

const doConfig = (c: ConfigLlm): PedidoDeConfig => ({
  teto_mensal_brl: texto(c.teto_mensal_brl),
  teto_confirmacao: '',
  ciencia_de_custo: false,
  alerta_percentual: texto(c.alerta_percentual),
  limite_diario_requisicoes: texto(c.limite_diario_requisicoes),
  preco_entrada_brl_por_milhao: texto(c.preco_entrada_brl_por_milhao),
  preco_saida_brl_por_milhao: texto(c.preco_saida_brl_por_milhao),
});

/**
 * Painel “Limite de gasto da IA”: teto mensal, alerta, limite diário, preço por 1 milhão de tokens (informado por você: a
 * ferramenta não inventa preço) e os modelos gratuitos em ordem de tentativa. Subir o teto acima do atual exige ciência de custo
 * e o valor digitado duas vezes; reduzir é livre. Teto atingido bloqueia as chamadas e o POP sai pelo template.
 */
export function PainelLimiteGasto({ llm }: { llm: EstadoLlm }) {
  const [pedido, setPedido] = useState<PedidoDeConfig>(() => doConfig(llm.config));
  const [modelos, setModelos] = useState<string[]>(() => [...llm.config.modelos, '', ''].slice(0, 3));
  const [erros, setErros] = useState<ErrosDeConfig & { modelos?: string }>({});
  const [salvo, setSalvo] = useState(false);
  // A config pode chegar depois da tela (a do servidor, se mais recente): o formulário passa a mostrá-la.
  useEffect(() => {
    setPedido(doConfig(llm.config));
    setModelos([...llm.config.modelos, '', ''].slice(0, 3));
  }, [llm.config]);
  const agora = new Date();
  const uso = usoDeHoje(llm.uso, agora);
  const nivel = nivelDeAlerta(llm.config, uso, llm.modo, agora);
  const barra = percentualDoTeto(llm.config, uso);

  const aumentando = numeroDoCampo(pedido.teto_mensal_brl) > llm.config.teto_mensal_brl;
  const mudar = (campo: keyof PedidoDeConfig, valor: string | boolean) => {
    setSalvo(false);
    setPedido((p) => ({ ...p, [campo]: valor }));
  };

  const salvar = () => {
    const lista = normalizarModelos(modelos);
    const preenchidos = modelos.map((m) => m.trim()).filter(Boolean);
    const errosModelos = lista.length === 0 ? 'Informe ao menos um modelo gratuito (termina em :free).' : lista.length !== preenchidos.length ? 'Há modelos inválidos, repetidos ou pagos: use ids :free diferentes entre si, até 3.' : undefined;
    const r = aplicarPedidoDeConfig(llm.config, pedido, new Date().toISOString());
    if (!r.ok || errosModelos) {
      setErros({ ...(r.ok ? {} : r.erros), ...(errosModelos ? { modelos: errosModelos } : {}) });
      setSalvo(false);
      return;
    }
    llm.salvarConfig({ ...r.config, modelos: lista });
    setPedido(doConfig({ ...r.config, modelos: lista }));
    setModelos([...lista, '', ''].slice(0, 3));
    setErros({});
    setSalvo(true);
  };

  return (
    <div className="llm-limite">
      <div className="llm-limite__uso" aria-live="polite">
        <p>
          Gasto estimado do mês: <strong>{brl(uso.gasto_estimado_brl)}</strong> de {brl(llm.config.teto_mensal_brl)}.{' '}
          {llm.config.teto_mensal_brl === 0 ? 'Teto R$ 0,00: nenhuma chamada paga.' : `${Math.round(barra)}% do teto.`}
        </p>
        <progress className="llm-limite__barra" max={100} value={barra} aria-label="Uso do teto mensal" />
        <p>
          Chamadas hoje: <strong>{uso.requisicoes_dia}</strong> de {llm.config.limite_diario_requisicoes}. Tokens no mês: {uso.tokens_entrada.toLocaleString('pt-BR')} de entrada e {uso.tokens_saida.toLocaleString('pt-BR')} de saída.
        </p>
        {nivel.teto === 'bloqueado' && (
          <p role="alert" className="pop-aviso">
            Teto de gasto atingido: a IA particular está bloqueada e o texto segue pelo template.
          </p>
        )}
        {nivel.teto === 'alerta' && (
          <p role="status" className="pop-aviso">
            Você já usou {Math.round(barra)}% do teto mensal.
          </p>
        )}
        {nivel.diario === 'bloqueado' && (
          <p role="alert" className="pop-aviso">
            Limite diário de chamadas atingido: a IA volta amanhã e o texto segue pelo template.
          </p>
        )}
        {nivel.diario === 'alerta' && (
          <p role="status" className="pop-aviso">
            Você está perto do limite diário de chamadas.
          </p>
        )}
        <Botao variante="discreto" onClick={llm.zerarContadorDoMes}>
          Zerar contador do mês
        </Botao>
      </div>

      <form className="llm-limite__form" noValidate onSubmit={(e) => e.preventDefault()} aria-label="Limite de gasto da IA">
        <div className="llm-limite__campos">
          <CampoTexto rotulo="Teto mensal (R$)" ajuda="0 = nenhuma chamada paga (padrão)." inputMode="decimal" value={pedido.teto_mensal_brl} erro={erros.teto_mensal_brl} onChange={(e) => mudar('teto_mensal_brl', e.target.value)} />
          <CampoTexto rotulo="Alerta em (%)" ajuda="Avisa quando o uso chegar a este percentual." inputMode="numeric" value={pedido.alerta_percentual} erro={erros.alerta_percentual} onChange={(e) => mudar('alerta_percentual', e.target.value)} />
          <CampoTexto
            rotulo="Limite diário de chamadas"
            ajuda="Vale para a IA padrão e para a particular."
            inputMode="numeric"
            value={pedido.limite_diario_requisicoes}
            erro={erros.limite_diario_requisicoes}
            onChange={(e) => mudar('limite_diario_requisicoes', e.target.value)}
          />
        </div>

        {aumentando && (
          <div className="llm-limite__ciencia">
            <CampoMarcacao
              rotulo="Entendo que o gasto é cobrado na minha conta do provedor."
              checked={pedido.ciencia_de_custo}
              erro={erros.ciencia_de_custo}
              onChange={(e) => mudar('ciencia_de_custo', e.target.checked)}
            />
            <CampoTexto rotulo="Digite o novo teto de novo (R$)" inputMode="decimal" value={pedido.teto_confirmacao} erro={erros.teto_confirmacao} onChange={(e) => mudar('teto_confirmacao', e.target.value)} />
          </div>
        )}

        <div className="llm-limite__campos">
          <CampoTexto
            rotulo="Preço de entrada (R$ por 1 milhão de tokens)"
            ajuda="Só para a IA particular. Informe o preço da sua conta; a ferramenta não inventa preço."
            inputMode="decimal"
            value={pedido.preco_entrada_brl_por_milhao}
            erro={erros.preco_entrada_brl_por_milhao}
            onChange={(e) => mudar('preco_entrada_brl_por_milhao', e.target.value)}
          />
          <CampoTexto
            rotulo="Preço de saída (R$ por 1 milhão de tokens)"
            inputMode="decimal"
            value={pedido.preco_saida_brl_por_milhao}
            erro={erros.preco_saida_brl_por_milhao}
            onChange={(e) => mudar('preco_saida_brl_por_milhao', e.target.value)}
          />
        </div>

        <fieldset className="llm-limite__modelos">
          <legend>Modelos gratuitos, em ordem de tentativa</legend>
          <p className="campo__ajuda">Se o primeiro falhar, tenta o segundo e depois o terceiro (até 3 tentativas). Um modelo que falha fica 10 minutos em pausa.</p>
          {modelos.map((m, i) => (
            <CampoTexto
              key={i}
              rotulo={i === 0 ? 'Principal' : `Reserva ${i}`}
              spellCheck={false}
              value={m}
              erro={i === 0 ? erros.modelos : undefined}
              onChange={(e) => {
                setSalvo(false);
                setModelos((atual) => atual.map((x, k) => (k === i ? e.target.value : x)));
              }}
            />
          ))}
        </fieldset>

        <div className="pop-acoes">
          <Botao variante="primario" onClick={salvar}>
            Salvar limite de gasto
          </Botao>
        </div>
        {salvo && (
          <p role="status" className="pop-aviso">
            {llm.noServidor === 'sim' ? 'Limite de gasto salvo neste navegador e no servidor.' : 'Limite de gasto salvo neste navegador.'}
          </p>
        )}
        {!llm.persistindo && (
          <p role="status" className="pop-aviso">
            Este navegador não guardou a configuração: ela vale só até você fechar a página.
          </p>
        )}
      </form>
    </div>
  );
}
