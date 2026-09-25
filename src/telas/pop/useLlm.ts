import { useCallback, useEffect, useRef, useState } from 'react';
import { gravarConfigServidor, lerConfigServidor, maisRecente } from '../../backup/servidor';
import type { ArmazenamentoTexto } from '../../estado/armazenamento';
import { armazenamentoDoNavegador } from '../../estado/armazenamento';
import type { Ambiente } from '../../llm/ambiente';
import { lerAmbiente } from '../../llm/ambiente';
import { gravarConfigLocal, gravarConsentimento, gravarUsoLocal, lerConfigLocal, lerConsentimento, lerUsoLocal } from '../../llm/armazenamento';
import type { ConfigLlm } from '../../llm/config';
import { configPadrao } from '../../llm/config';
import type { ModoLlm, UsoLlm } from '../../llm/limite_gasto';
import { usoDeHoje, usoVazio, zerarMes } from '../../llm/limite_gasto';
import type { EntradaRedacao } from '../../llm/prompt';
import type { Pausas, ResultadoRedacao } from '../../llm/redigir';
import { redigirCampo } from '../../llm/redigir';

export interface EstadoLlm {
  ambiente: Ambiente;
  config: ConfigLlm;
  uso: UsoLlm;
  modo: ModoLlm;
  consentimento: boolean;
  /** só na memória desta página: nunca vai para o storage, para o servidor nem para a config. */
  chaveParticular: string;
  modeloParticular: string;
  urlParticular: string;
  pausas: Pausas;
  /** `false` quando o navegador não guardou a configuração ou o uso (valem só até fechar a página). */
  persistindo: boolean;
  /** a config está guardada também no servidor (`sim`), só neste navegador (`nao`) ou ainda não se sabe (`verificando`). */
  noServidor: 'verificando' | 'sim' | 'nao';
  /** a IA pode ser usada agora (build normal e chave do modo escolhido preenchida). */
  pronta: boolean;
  mudarModo: (m: ModoLlm) => void;
  mudarConsentimento: (aceito: boolean) => void;
  mudarChaveParticular: (v: string) => void;
  mudarModeloParticular: (v: string) => void;
  mudarUrlParticular: (v: string) => void;
  salvarConfig: (c: ConfigLlm) => void;
  zerarContadorDoMes: () => void;
  redigir: (entrada: EntradaRedacao) => Promise<ResultadoRedacao>;
}

/**
 * Estado da IA (03.3): config e uso no navegador, consentimento, modo padrão/particular e a chamada com failover.
 * A chave particular vive só em `useState`. `armazenamento`: `undefined` = localStorage, `null` = sem storage.
 */
export function useLlm(opcoes: { armazenamento?: ArmazenamentoTexto | null; ambiente?: Ambiente; fetchFn?: typeof fetch; fetchServidor?: typeof fetch; agora?: () => Date } = {}): EstadoLlm {
  const [storage] = useState<ArmazenamentoTexto | null>(() => (opcoes.armazenamento === undefined ? armazenamentoDoNavegador() : opcoes.armazenamento));
  const [ambiente] = useState(() => opcoes.ambiente ?? lerAmbiente());
  const relogio = opcoes.agora ?? (() => new Date());
  const [config, setConfig] = useState<ConfigLlm>(() => lerConfigLocal(storage) ?? configPadrao(ambiente.padroes, relogio().toISOString()));
  const [uso, setUso] = useState<UsoLlm>(() => usoDeHoje(lerUsoLocal(storage) ?? usoVazio(relogio()), relogio()));
  const [consentimento, setConsentimento] = useState(() => lerConsentimento(storage));
  const [modo, setModo] = useState<ModoLlm>('padrao');
  const [chaveParticular, setChave] = useState('');
  const [modeloParticular, setModelo] = useState('');
  const [urlParticular, setUrl] = useState('');
  const [pausas, setPausas] = useState<Pausas>({});
  const [persistindo, setPersistindo] = useState(storage !== null);
  const [noServidor, setNoServidor] = useState<'verificando' | 'sim' | 'nao'>('verificando');

  // O `redigir` é assíncrono: sempre parte do estado mais recente, não do capturado na renderização.
  const vivo = useRef({ config, uso, pausas, consentimento, modo, chaveParticular, modeloParticular, urlParticular });
  vivo.current = { config, uso, pausas, consentimento, modo, chaveParticular, modeloParticular, urlParticular };

  // Ao abrir: a config do servidor (a mesma para quem usa a ferramenta em outro computador) vale se for mais recente que a local.
  useEffect(() => {
    let ativo = true;
    void lerConfigServidor(opcoes.fetchServidor).then((doServidor) => {
      if (!ativo) return;
      setNoServidor(doServidor ? 'sim' : 'nao');
      if (!doServidor) return;
      const vencedora = maisRecente(vivo.current.config, doServidor);
      if (vencedora !== vivo.current.config) {
        setConfig(vencedora);
        gravarConfigLocal(vencedora, storage);
      }
    });
    return () => {
      ativo = false;
    };
    // só na montagem
  }, []);

  const guardarUso = useCallback(
    (novo: UsoLlm) => {
      setUso(novo);
      if (!gravarUsoLocal(novo, storage)) setPersistindo(false);
    },
    [storage],
  );

  const salvarConfig = useCallback(
    (c: ConfigLlm) => {
      setConfig(c);
      if (!gravarConfigLocal(c, storage)) setPersistindo(false);
      void gravarConfigServidor(c, opcoes.fetchServidor).then((guardou) => setNoServidor(guardou ? 'sim' : 'nao'));
    },
    // eslint-disable-next-line
    [storage],
  );

  const mudarConsentimento = useCallback(
    (aceito: boolean) => {
      setConsentimento(aceito);
      if (!gravarConsentimento(aceito, relogio().toISOString(), storage)) setPersistindo(false);
    },
    [storage],
  );

  const redigir = useCallback(
    async (entrada: EntradaRedacao) => {
      const v = vivo.current;
      const chave = v.modo === 'padrao' ? ambiente.chave : v.chaveParticular;
      const r = await redigirCampo(entrada, {
        config: v.config,
        uso: v.uso,
        pausas: v.pausas,
        modo: v.modo,
        chave,
        modeloParticular: v.modeloParticular,
        urlParticular: v.urlParticular || undefined,
        consentimento: ambiente.llmDisponivel && v.consentimento,
        agora: relogio,
        fetchFn: opcoes.fetchFn,
        titulo: ambiente.titulo,
      });
      guardarUso(r.uso);
      setPausas(r.pausas);
      return r;
    },
    [ambiente, guardarUso, opcoes.fetchFn],
  );

  return {
    ambiente,
    config,
    uso,
    modo,
    consentimento,
    chaveParticular,
    modeloParticular,
    urlParticular,
    pausas,
    persistindo,
    noServidor,
    pronta: ambiente.llmDisponivel && (modo === 'padrao' ? ambiente.chave !== '' : chaveParticular.trim() !== ''),
    mudarModo: setModo,
    mudarConsentimento,
    mudarChaveParticular: setChave,
    mudarModeloParticular: setModelo,
    mudarUrlParticular: setUrl,
    salvarConfig,
    zerarContadorDoMes: () => guardarUso(zerarMes(usoDeHoje(vivo.current.uso, relogio()))),
    redigir,
  };
}
