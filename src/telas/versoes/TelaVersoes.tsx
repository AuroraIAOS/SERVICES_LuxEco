import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ClienteBackups, ListaDeVersoes, Versao } from '../../backup/cliente';
import { criarCliente } from '../../backup/cliente';
import type { ArmazenamentoTexto } from '../../estado/armazenamento';
import { armazenamentoDoNavegador } from '../../estado/armazenamento';
import { desfazerRestauracao, existeDesfazer, lerEstadoDoHtml, restaurarBackup, ROTULO_ESCOPO } from '../../backup/estado';
import { baixar, baixarBytes, dataLocal } from '../../exportar/baixar';
import { Botao, CampoSeletor, CampoTexto, EstadoVazio, Numeros, Tela } from '../../ui';
import { SalvarVersao } from '../comum/SalvarVersao';
import type { FiltroEscopo, OrdemVersoes } from './modelo';
import { alternarTodas, alternarUma, avisoDeLimite, estadoDaSelecao, filtrarEOrdenar, indiceJson, podarSelecao, separarProtegidas, tamanhoLegivel } from './modelo';

const dataHora = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};
const descricao = (v: Versao) => `${v.rotulo.trim() || 'sem rótulo'}, ${dataHora(v.criado_em)}`;

type Confirmacao = { tipo: 'excluir'; excluir: Versao[]; protegidas: Versao[] } | { tipo: 'restaurar'; versao: Versao } | null;
type Aviso = { tipo: 'ok' | 'erro'; texto: string } | null;

/**
 * “Versões salvas” (#/versoes): lista as versões guardadas no servidor (máximo 10), com seleção (uma, várias, todas), ações por versão
 * (pré-visualizar, baixar, restaurar, renomear, proteger) e em lote (.zip, excluir, proteger, índice). Nenhuma exclusão sem confirmação;
 * versões protegidas nunca entram na exclusão; a pré-visualização abre em outra aba, sob sandbox do servidor (nunca dentro desta página).
 */
export function TelaVersoes({ cliente: clienteExterno, armazenamento, agora = () => new Date() }: { cliente?: ClienteBackups; armazenamento?: ArmazenamentoTexto | null; agora?: () => Date }) {
  const [cliente] = useState(() => clienteExterno ?? criarCliente());
  const [storage] = useState<ArmazenamentoTexto | null>(() => (armazenamento === undefined ? armazenamentoDoNavegador() : armazenamento));
  const [carga, setCarga] = useState<'carregando' | 'ok' | 'erro'>('carregando');
  const [erro, setErro] = useState('');
  const [lista, setLista] = useState<ListaDeVersoes | null>(null);
  const [selecionadas, setSelecionadas] = useState<ReadonlySet<string>>(new Set());
  const [ordem, setOrdem] = useState<OrdemVersoes>('recentes');
  const [escopo, setEscopo] = useState<FiltroEscopo>('todos');
  const [busca, setBusca] = useState('');
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const [renomeando, setRenomeando] = useState<{ id: string; valor: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [podeDesfazer, setPodeDesfazer] = useState(() => existeDesfazer(storage));
  const idTabela = useId();
  const tituloRef = useRef<HTMLDivElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const marcarTodasRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const r = await cliente.listar();
    if (r.ok) {
      setLista(r.dados);
      setSelecionadas((s) => podarSelecao(s, r.dados.itens));
      setCarga('ok');
    } else {
      setErro(r.mensagem);
      setCarga('erro');
    }
  }, [cliente]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const itens = lista?.itens ?? [];
  const visiveis = useMemo(() => filtrarEOrdenar(itens, { escopo, busca, ordem }), [itens, escopo, busca, ordem]);
  const estadoSelecao = estadoDaSelecao(visiveis, selecionadas);
  const totalSelecionadas = selecionadas.size;
  const limite = lista?.limite ?? 10;
  const nivelLimite = lista ? avisoDeLimite(lista.total, limite) : 'ok';

  useEffect(() => {
    if (marcarTodasRef.current) marcarTodasRef.current.indeterminate = estadoSelecao === 'algumas';
  }, [estadoSelecao]);

  useEffect(() => {
    if (confirmacao) painelRef.current?.focus();
  }, [confirmacao]);

  /** depois de uma ação que remove linhas, o foco volta ao título da tabela (não se perde no vazio). */
  const devolverFoco = () => setTimeout(() => tituloRef.current?.focus(), 0);

  async function executar(acao: () => Promise<void>) {
    setOcupado(true);
    setAviso(null);
    try {
      await acao();
    } finally {
      setOcupado(false);
    }
  }

  const escolhidas = () => itens.filter((v) => selecionadas.has(v.id));

  // ---- ações unitárias e em lote ----
  const alternarProtecao = (v: Versao) =>
    executar(async () => {
      const r = await cliente.proteger(v.id, !v.protegido);
      if (!r.ok) return setAviso({ tipo: 'erro', texto: r.mensagem });
      await carregar();
      setAviso({ tipo: 'ok', texto: r.dados.protegido ? `Versão protegida: ${descricao(v)}.` : `Proteção removida: ${descricao(v)}.` });
    });

  const protegerLote = (valor: boolean) =>
    executar(async () => {
      let feitas = 0;
      for (const v of escolhidas()) {
        if (v.protegido === valor) continue;
        const r = await cliente.proteger(v.id, valor);
        if (!r.ok) {
          setAviso({ tipo: 'erro', texto: r.mensagem });
          break;
        }
        feitas++;
      }
      await carregar();
      setAviso((a) => a ?? { tipo: 'ok', texto: `${feitas} ${feitas === 1 ? 'versão' : 'versões'} ${valor ? 'protegida' : 'desprotegida'}${feitas === 1 ? '' : 's'}.`.replace('versões protegida', 'versões protegidas').replace('versões desprotegida', 'versões desprotegidas') });
    });

  const confirmarRenomear = () =>
    executar(async () => {
      if (!renomeando) return;
      const r = await cliente.renomear(renomeando.id, renomeando.valor.trim());
      if (!r.ok) return setAviso({ tipo: 'erro', texto: r.mensagem });
      setRenomeando(null);
      await carregar();
      setAviso({ tipo: 'ok', texto: 'Rótulo atualizado.' });
    });

  const baixarZipLote = () =>
    executar(async () => {
      const r = await cliente.baixarZip([...selecionadas]);
      if (!r.ok) return setAviso({ tipo: 'erro', texto: r.mensagem });
      baixarBytes(`lux_versoes_${dataLocal(agora())}.zip`, new Uint8Array(await r.dados.arrayBuffer()), 'application/zip');
      setAviso({ tipo: 'ok', texto: `Arquivo .zip baixado com ${totalSelecionadas} ${totalSelecionadas === 1 ? 'versão' : 'versões'}.` });
    });

  const exportarIndice = () => {
    const alvo = totalSelecionadas > 0 ? escolhidas() : itens;
    baixar(`lux_indice_versoes_${dataLocal(agora())}.json`, indiceJson(alvo, limite, agora()), 'application/json');
    setAviso({ tipo: 'ok', texto: `Índice baixado (${alvo.length} ${alvo.length === 1 ? 'versão' : 'versões'}, só os dados de cada uma, sem o conteúdo).` });
  };

  const pedirExclusao = () => {
    const { excluir, protegidas } = separarProtegidas(itens, selecionadas);
    setAviso(null);
    setConfirmacao({ tipo: 'excluir', excluir, protegidas });
  };

  const confirmarExclusao = () =>
    executar(async () => {
      if (confirmacao?.tipo !== 'excluir' || confirmacao.excluir.length === 0) return;
      const r = await cliente.excluir(confirmacao.excluir.map((v) => v.id));
      setConfirmacao(null);
      if (!r.ok) return setAviso({ tipo: 'erro', texto: r.mensagem });
      await carregar();
      const n = r.dados.excluidos.length;
      setAviso({ tipo: 'ok', texto: `${n} ${n === 1 ? 'versão excluída' : 'versões excluídas'}.${r.dados.ignorados_protegidos.length ? ` ${r.dados.ignorados_protegidos.length} protegida(s) ficaram.` : ''}` });
      devolverFoco();
    });

  const confirmarRestauracao = () =>
    executar(async () => {
      if (confirmacao?.tipo !== 'restaurar') return;
      const alvo = confirmacao.versao;
      setConfirmacao(null);
      const arq = await cliente.baixarTexto(alvo.id);
      if (!arq.ok) return setAviso({ tipo: 'erro', texto: arq.mensagem });
      const lido = lerEstadoDoHtml(arq.dados);
      if (!lido.ok) return setAviso({ tipo: 'erro', texto: lido.erro });
      const { IDS_EXISTENTES } = await import('../../backup/gerar_completo');
      const r = restaurarBackup(lido.estado, alvo.escopo, IDS_EXISTENTES, agora(), storage);
      setPodeDesfazer(existeDesfazer(storage));
      if (!r.ok) return setAviso({ tipo: 'erro', texto: r.erro ?? 'Não foi possível restaurar.' });
      setAviso({ tipo: 'ok', texto: `Versão restaurada (${ROTULO_ESCOPO[alvo.escopo]}): ${descricao(alvo)}.${r.ignoradas ? ` ${r.ignoradas} item(ns) que já não existem nesta versão da ferramenta foram ignorados.` : ''} O estado anterior ficou guardado para desfazer.` });
      devolverFoco();
    });

  const desfazer = () => {
    const r = desfazerRestauracao(agora(), storage);
    setAviso(r.ok ? { tipo: 'ok', texto: 'Restauração desfeita: o estado de antes voltou.' } : { tipo: 'erro', texto: r.erro ?? 'Não foi possível desfazer.' });
    setPodeDesfazer(existeDesfazer(storage));
  };

  const protegidas = itens.filter((v) => v.protegido).length;

  return (
    <Tela
      titulo="Versões salvas"
      subtitulo="Cópias de segurança guardadas no servidor"
      resumo={
        <Numeros
          itens={[
            { valor: lista?.total ?? 0, rotulo: lista?.total === 1 ? 'versão salva' : 'versões salvas' },
            { valor: protegidas, rotulo: protegidas === 1 ? 'protegida' : 'protegidas' },
          ]}
        />
      }
    >
      <div ref={tituloRef} tabIndex={-1} className="versoes__topo">
        <SalvarVersao escopoPadrao="completo" cliente={cliente} aoSalvar={() => void carregar()} />
        {podeDesfazer && (
          <div className="versoes__desfazer">
            <Botao variante="secundario" onClick={desfazer}>
              Desfazer última restauração
            </Botao>
          </div>
        )}
      </div>

      {aviso && (
        <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className="pop-aviso">
          {aviso.texto}
        </p>
      )}

      {carga === 'carregando' && <p role="status">Carregando as versões…</p>}

      {carga === 'erro' && (
        <EstadoVazio
          titulo="Não foi possível carregar as versões"
          texto={`${erro} As suas edições continuam neste navegador; nada foi perdido.`}
          acao={
            <Botao variante="primario" onClick={() => void carregar()}>
              Tentar de novo
            </Botao>
          }
        />
      )}

      {carga === 'ok' && lista && (
        <>
          <p className="versoes__contador" role="status">
            <strong>{lista.total}</strong> de {limite} versões
          </p>
          {nivelLimite !== 'ok' && (
            <p role="status" className="pop-aviso">
              {nivelLimite === 'cheio' ? `Limite de ${limite} versões atingido: para salvar outra, exclua uma versão.` : `Você está perto do limite: restam ${limite - lista.total} vaga(s). Exclua as versões antigas de que não precisa mais.`}
            </p>
          )}

          {lista.total === 0 ? (
            <EstadoVazio titulo="Nenhuma versão salva ainda" texto="Use “Salvar versão” aqui, no FPE ou no POP para guardar uma cópia no servidor. Você pode voltar a ela quando quiser." />
          ) : (
            <>
              <div className="versoes__filtros" role="search" aria-label="Filtrar as versões">
                <CampoTexto rotulo="Buscar no rótulo" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <CampoSeletor
                  rotulo="Mostrar"
                  value={escopo}
                  onChange={(e) => setEscopo(e.target.value as FiltroEscopo)}
                  opcoes={[{ valor: 'todos', rotulo: 'Todas' }, { valor: 'fpe', rotulo: 'Só FPE' }, { valor: 'pop', rotulo: 'Só POP' }, { valor: 'completo', rotulo: 'FPE e POP' }]}
                />
                <CampoSeletor rotulo="Ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemVersoes)} opcoes={[{ valor: 'recentes', rotulo: 'Mais recentes primeiro' }, { valor: 'antigas', rotulo: 'Mais antigas primeiro' }]} />
              </div>

              <div className="versoes__lote" role="group" aria-label="Ações nas versões selecionadas">
                <p className="versoes__selecionadas" role="status">
                  {totalSelecionadas === 0 ? 'Nenhuma versão selecionada.' : `${totalSelecionadas} ${totalSelecionadas === 1 ? 'versão selecionada' : 'versões selecionadas'}.`}
                </p>
                <Botao disabled={totalSelecionadas === 0 || ocupado} onClick={() => void baixarZipLote()}>
                  Baixar .zip
                </Botao>
                <Botao disabled={totalSelecionadas === 0 || ocupado} onClick={() => void protegerLote(true)}>
                  Proteger
                </Botao>
                <Botao disabled={totalSelecionadas === 0 || ocupado} onClick={() => void protegerLote(false)}>
                  Desproteger
                </Botao>
                <Botao variante="discreto" disabled={totalSelecionadas === 0 || ocupado} onClick={pedirExclusao}>
                  Excluir…
                </Botao>
                <Botao variante="discreto" onClick={exportarIndice}>
                  Exportar índice (.json)
                </Botao>
              </div>

              {confirmacao?.tipo === 'excluir' && (
                <div ref={painelRef} tabIndex={-1} role="alertdialog" aria-label="Confirmar exclusão" className="pop-aviso versoes__confirmar">
                  {confirmacao.excluir.length === 0 ? (
                    <p>Todas as versões selecionadas estão protegidas e não podem ser excluídas. Remova a proteção primeiro.</p>
                  ) : (
                    <>
                      <p>
                        Excluir {confirmacao.excluir.length === 1 ? 'esta versão' : `estas ${confirmacao.excluir.length} versões`}? Não dá para desfazer.
                      </p>
                      <ul>
                        {confirmacao.excluir.map((v) => (
                          <li key={v.id}>{descricao(v)}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {confirmacao.protegidas.length > 0 && (
                    <p>
                      {confirmacao.protegidas.length} {confirmacao.protegidas.length === 1 ? 'versão protegida fica' : 'versões protegidas ficam'} de fora: {confirmacao.protegidas.map(descricao).join('; ')}.
                    </p>
                  )}
                  <div className="versoes__botoes">
                    {confirmacao.excluir.length > 0 && (
                      <Botao variante="primario" onClick={() => void confirmarExclusao()} disabled={ocupado}>
                        Excluir definitivamente
                      </Botao>
                    )}
                    <Botao variante="discreto" onClick={() => setConfirmacao(null)}>
                      Cancelar
                    </Botao>
                  </div>
                </div>
              )}

              {confirmacao?.tipo === 'restaurar' && (
                <div ref={painelRef} tabIndex={-1} role="alertdialog" aria-label="Confirmar restauração" className="pop-aviso versoes__confirmar">
                  <p>
                    Restaurar <strong>{descricao(confirmacao.versao)}</strong> ({ROTULO_ESCOPO[confirmacao.versao.escopo]})? Isso <strong>substitui</strong> o que está neste navegador
                    {confirmacao.versao.escopo === 'completo' ? ' no FPE e no POP' : confirmacao.versao.escopo === 'fpe' ? ' no FPE' : ' no POP'}. Uma cópia do estado atual fica guardada e dá para desfazer.
                  </p>
                  <div className="versoes__botoes">
                    <Botao variante="primario" onClick={() => void confirmarRestauracao()} disabled={ocupado}>
                      Restaurar esta versão
                    </Botao>
                    <Botao variante="discreto" onClick={() => setConfirmacao(null)}>
                      Cancelar
                    </Botao>
                  </div>
                </div>
              )}

              <div className="versoes__rolagem">
                <table className="pop-tabela versoes__tabela" aria-describedby={idTabela}>
                  <caption id={idTabela} className="so-leitor">
                    Versões salvas no servidor
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        <input ref={marcarTodasRef} type="checkbox" className="campo__caixa" aria-label="Selecionar todas as versões mostradas" checked={estadoSelecao === 'todas'} onChange={() => setSelecionadas(alternarTodas(visiveis, selecionadas))} />
                      </th>
                      <th scope="col">Data e hora</th>
                      <th scope="col">Rótulo</th>
                      <th scope="col">O que tem</th>
                      <th scope="col">Tamanho</th>
                      <th scope="col">Versão do app</th>
                      <th scope="col">Proteção</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.length === 0 && (
                      <tr>
                        <td colSpan={8}>Nenhuma versão combina com o filtro.</td>
                      </tr>
                    )}
                    {visiveis.map((v) => (
                      <tr key={v.id} aria-selected={selecionadas.has(v.id)}>
                        <td>
                          <input type="checkbox" className="campo__caixa" aria-label={`Selecionar versão: ${descricao(v)}`} checked={selecionadas.has(v.id)} onChange={() => setSelecionadas(alternarUma(selecionadas, v.id))} />
                        </td>
                        <td>{dataHora(v.criado_em)}</td>
                        <td>
                          {renomeando?.id === v.id ? (
                            <form
                              className="versoes__renomear"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void confirmarRenomear();
                              }}
                              onKeyDown={(e) => e.key === 'Escape' && setRenomeando(null)}
                            >
                              <CampoTexto rotulo="Novo rótulo" maxLength={80} autoFocus value={renomeando.valor} onChange={(e) => setRenomeando({ id: v.id, valor: e.target.value })} />
                              <Botao variante="primario" tipo="submit" disabled={ocupado}>
                                Salvar rótulo
                              </Botao>
                              <Botao variante="discreto" onClick={() => setRenomeando(null)}>
                                Cancelar
                              </Botao>
                            </form>
                          ) : (
                            v.rotulo || <span className="campo__ajuda">sem rótulo</span>
                          )}
                        </td>
                        <td>{ROTULO_ESCOPO[v.escopo]}</td>
                        <td>{tamanhoLegivel(v.tamanho_bytes)}</td>
                        <td>{v.versao_app || '—'}</td>
                        <td>{v.protegido ? <span title="Protegida: não entra em exclusão">🔒 Protegida</span> : '—'}</td>
                        <td>
                          <div className="versoes__acoes">
                            <a className="botao botao--discreto" href={cliente.urlVer(v.id)} target="_blank" rel="noopener noreferrer" aria-label={`Pré-visualizar em outra aba: ${descricao(v)}`}>
                              Pré-visualizar
                            </a>
                            <a className="botao botao--discreto" href={cliente.urlBaixar(v.id)} download={`${v.id}.html`} aria-label={`Baixar .html: ${descricao(v)}`}>
                              Baixar
                            </a>
                            <Botao variante="discreto" disabled={ocupado} aria-label={`Restaurar: ${descricao(v)}`} onClick={() => setConfirmacao({ tipo: 'restaurar', versao: v })}>
                              Restaurar
                            </Botao>
                            <Botao variante="discreto" disabled={ocupado} aria-label={`Renomear: ${descricao(v)}`} onClick={() => setRenomeando({ id: v.id, valor: v.rotulo })}>
                              Renomear
                            </Botao>
                            <Botao variante="discreto" disabled={ocupado} aria-pressed={v.protegido} aria-label={`${v.protegido ? 'Remover a proteção de' : 'Proteger'}: ${descricao(v)}`} onClick={() => void alternarProtecao(v)}>
                              {v.protegido ? 'Desproteger' : 'Proteger'}
                            </Botao>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Tela>
  );
}
