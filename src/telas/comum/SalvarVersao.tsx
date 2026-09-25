import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ClienteBackups, Versao } from '../../backup/cliente';
import { criarCliente, MENSAGEM_LIMITE } from '../../backup/cliente';
import type { EscopoBackup } from '../../backup/estado';
import { ESCOPOS_BACKUP, ROTULO_ESCOPO } from '../../backup/estado';
import type { EstadoFpe } from '../../estado/armazenamento';
import { lerEstadoFpe } from '../../estado/armazenamento';
import type { EstadoPop } from '../../estado/pop';
import { lerEstadoPop } from '../../estado/pop';
import { baixar, dataLocal } from '../../exportar/baixar';
import { Botao, CampoSeletor, CampoTexto } from '../../ui';

const dataHora = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};
const p2 = (n: number) => String(n).padStart(2, '0');
/** `versao_<escopo>_<AAAA-MM-DD>_<HHMM>.html` */
export const nomeArquivoVersao = (escopo: EscopoBackup, agora: Date) => `versao_${escopo}_${dataLocal(agora)}_${p2(agora.getHours())}${p2(agora.getMinutes())}.html`;

type Situacao = 'verificando' | 'sim' | 'nao';
type Aviso = { tipo: 'ok' | 'erro'; texto: string } | null;

/**
 * “Salvar versão” (FPE, POP e Versões salvas): pede um rótulo opcional, gera o backup .html a partir do estado do navegador e o envia
 * ao servidor. Sem servidor (offline, `localhost` sem PHP, arquivo do disco) o botão fica desativado com a explicação e “Baixar arquivo”
 * continua. Falha nenhuma apaga ou altera o que a pessoa editou. No 11º salvamento (409) só se oferece excluir a versão mais antiga NÃO
 * protegida, com confirmação explícita.
 */
export function SalvarVersao({
  escopoPadrao,
  estadoFpe,
  estadoPop,
  cliente: clienteExterno,
  aoSalvar,
  mostrarLinkParaVersoes = true,
}: {
  escopoPadrao: EscopoBackup;
  /** o estado em memória da tela; sem ele, lê do navegador na hora de salvar. */
  estadoFpe?: EstadoFpe;
  estadoPop?: EstadoPop;
  cliente?: ClienteBackups;
  aoSalvar?: () => void;
  /** o atalho “Ver versões salvas” (FPE e POP). Na própria tela de versões é redundante: passe `false`. */
  mostrarLinkParaVersoes?: boolean;
}) {
  const [cliente] = useState(() => clienteExterno ?? criarCliente());
  const idExplicacao = useId();
  const [servidor, setServidor] = useState<Situacao>('verificando');
  const [aberto, setAberto] = useState(false);
  const [rotulo, setRotulo] = useState('');
  const [escopo, setEscopo] = useState<EscopoBackup>(escopoPadrao);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  /** a versão que seria excluída para abrir vaga (aguardando a confirmação). */
  const [paraSubstituir, setParaSubstituir] = useState<Versao | null>(null);

  useEffect(() => {
    let ativo = true;
    void cliente.listar().then((r) => ativo && setServidor(r.ok ? 'sim' : 'nao'));
    return () => {
      ativo = false;
    };
  }, [cliente]);

  const estados = () => ({ fpe: estadoFpe ?? lerEstadoFpe().estado, pop: estadoPop ?? lerEstadoPop().estado });

  async function montar(agora: Date) {
    const { montarBackup } = await import('../../backup/gerar_completo');
    const e = estados();
    return montarBackup(escopo, rotulo, e.fpe, e.pop, agora);
  }

  async function salvar() {
    setOcupado(true);
    setAviso(null);
    setParaSubstituir(null);
    try {
      const b = await montar(new Date());
      if (b.grandeDemais) {
        setAviso({ tipo: 'erro', texto: 'Esta versão passa de 5 MB e não pode ser guardada no servidor. Use “Baixar arquivo”.' });
        return;
      }
      const r = await cliente.criar({ html: b.html, rotulo: rotulo.trim(), escopo, versao_app: b.versaoApp });
      if (r.ok) {
        setAviso({ tipo: 'ok', texto: `Versão salva (${r.dados.total} de ${r.dados.limite}).` });
        setAberto(false);
        setRotulo('');
        aoSalvar?.();
        return;
      }
      if (r.falha === 'limite') {
        const l = await cliente.listar();
        const maisAntiga = l.ok ? [...l.dados.itens].filter((v) => !v.protegido).sort((a, b) => Date.parse(a.criado_em) - Date.parse(b.criado_em))[0] : undefined;
        if (maisAntiga) setParaSubstituir(maisAntiga);
        setAviso({ tipo: 'erro', texto: maisAntiga ? MENSAGEM_LIMITE : `${MENSAGEM_LIMITE} Todas as versões estão protegidas: desproteja ou exclua alguma em “Versões salvas”.` });
        return;
      }
      setAviso({ tipo: 'erro', texto: r.mensagem });
      if (r.falha === 'sem_servidor') setServidor('nao');
    } finally {
      setOcupado(false);
    }
  }

  async function substituir() {
    if (!paraSubstituir) return;
    setOcupado(true);
    try {
      const ex = await cliente.excluir([paraSubstituir.id]);
      if (!ex.ok || ex.dados.excluidos.length === 0) {
        setAviso({ tipo: 'erro', texto: ex.ok ? 'A versão mais antiga está protegida e não foi excluída.' : ex.mensagem });
        setParaSubstituir(null);
        return;
      }
      setParaSubstituir(null);
    } finally {
      setOcupado(false);
    }
    await salvar();
  }

  async function baixarArquivo() {
    setAviso(null);
    const agora = new Date();
    const b = await montar(agora);
    baixar(nomeArquivoVersao(escopo, agora), b.html, 'text/html');
    setAviso({ tipo: 'ok', texto: 'Arquivo baixado. Ele também serve para restaurar depois, em “Versões salvas”.' });
  }

  return (
    <section className="salvar-versao" aria-label="Salvar versão">
      <div className="salvar-versao__botoes">
        <Botao variante="secundario" disabled={servidor !== 'sim' || ocupado} aria-describedby={servidor === 'nao' ? idExplicacao : undefined} onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
          Salvar versão
        </Botao>
        <Botao variante="discreto" disabled={ocupado} onClick={() => void baixarArquivo()}>
          Baixar arquivo
        </Botao>
        {mostrarLinkParaVersoes && (
          <Link to="/versoes" className="botao botao--discreto">
            Ver versões salvas
          </Link>
        )}
      </div>
      {servidor === 'nao' && (
        <p id={idExplicacao} className="campo__ajuda">
          O servidor de versões não está disponível aqui (sem internet, arquivo aberto do disco ou ambiente de desenvolvimento). Use “Baixar arquivo”.
        </p>
      )}

      {aberto && servidor === 'sim' && (
        <form
          className="salvar-versao__form"
          aria-label="Nova versão"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void salvar();
          }}
        >
          <CampoTexto rotulo="Rótulo (opcional)" ajuda="Um nome para achar esta versão depois. Até 80 caracteres." maxLength={80} value={rotulo} onChange={(e) => setRotulo(e.target.value)} />
          <CampoSeletor rotulo="O que salvar" opcoes={ESCOPOS_BACKUP.map((v) => ({ valor: v, rotulo: ROTULO_ESCOPO[v] }))} value={escopo} onChange={(e) => setEscopo(e.target.value as EscopoBackup)} />
          <div className="salvar-versao__botoes">
            <Botao variante="primario" tipo="submit" disabled={ocupado}>
              Salvar
            </Botao>
            <Botao variante="discreto" onClick={() => setAberto(false)} disabled={ocupado}>
              Cancelar
            </Botao>
          </div>
        </form>
      )}

      {paraSubstituir && (
        <div role="alertdialog" aria-label="Confirmar exclusão da versão mais antiga" className="pop-aviso salvar-versao__confirmar">
          <p>
            O limite foi atingido. Para salvar esta versão, a mais antiga não protegida será <strong>excluída</strong>: {paraSubstituir.rotulo || 'sem rótulo'}, de {dataHora(paraSubstituir.criado_em)}.
          </p>
          <div className="salvar-versao__botoes">
            <Botao variante="primario" onClick={() => void substituir()} disabled={ocupado}>
              Excluir a mais antiga e salvar
            </Botao>
            <Botao
              variante="discreto"
              onClick={() => {
                setParaSubstituir(null);
                setAviso(null);
              }}
              disabled={ocupado}
            >
              Cancelar
            </Botao>
          </div>
        </div>
      )}

      {aviso && (
        <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className="pop-aviso">
          {aviso.texto}
        </p>
      )}
    </section>
  );
}
