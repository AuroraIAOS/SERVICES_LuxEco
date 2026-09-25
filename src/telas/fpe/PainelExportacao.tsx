import { useId, useState } from 'react';
import type { DocumentoFichas, MatrizV08, Setor } from '../../dados/tipos';
import type { EstadoFpe } from '../../estado/armazenamento';
import { baixar, MIME, nomeArquivo } from '../../exportar/baixar';
import { montarDocumentoFichas } from '../../exportar/documento';
import { exportarJson, importarJson, TAMANHO_MAXIMO_BYTES } from '../../exportar/json';
import { renderizarMd } from '../../exportar/md';
import { baixarPlanilha, ESCOPO_XLSX } from '../../exportar/xlsx_botao';
import { lerEstadoPop } from '../../estado/pop';
import { htmlFichas, imprimir } from '../../exportar/pdf';
import { Botao, BotaoExportar } from '../../ui';
import type { Fpe } from './modelo';

interface Pendente {
  estado: EstadoFpe;
  arquivo: string;
  exportadoEm: string;
  ignoradas: number;
}
type Aviso = { tipo: 'erro' | 'ok'; texto: string } | null;

const dataBR = (d: Date) => d.toLocaleDateString('pt-BR');
const semExtensao = (nome: string) => nome.replace(/\.[^.]+$/, '');
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Exportações do FPE: fichas em Markdown e PDF (um setor ou todos), estado completo em JSON e importação desse JSON.
 * Tudo com os valores EM VIGOR (padrão + edições). Importar SUBSTITUI as edições atuais, só depois de a pessoa confirmar.
 */
export function PainelExportacao({
  fpe,
  dados,
  fichas,
  estado,
  setor,
  aoImportar,
}: {
  fpe: Fpe;
  dados: MatrizV08;
  fichas: DocumentoFichas;
  estado: EstadoFpe;
  setor: Setor;
  /** devolve `false` se o navegador não guardou a cópia de segurança das edições anteriores. */
  aoImportar: (novo: EstadoFpe) => boolean;
}) {
  const idTitulo = useId();
  const idArquivo = useId();
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [rodada, setRodada] = useState(0); // troca a key do <input type=file> para poder escolher o mesmo arquivo de novo

  const edicoesAtuais = Object.keys(estado.fpe_edicoes).length;

  const mdSetor = () => {
    const agora = new Date();
    baixar(nomeArquivo(setor.nome, 'md', agora), renderizarMd(montarDocumentoFichas(fpe, dados, setor.id), dataBR(agora)), MIME.md);
  };
  const mdGeral = () => {
    const agora = new Date();
    baixar(nomeArquivo('geral', 'md', agora), renderizarMd(montarDocumentoFichas(fpe, dados), dataBR(agora)), MIME.md);
  };
  const pdfSetor = () => {
    const agora = new Date();
    imprimir(htmlFichas(montarDocumentoFichas(fpe, dados, setor.id), dataBR(agora)), 'a4', semExtensao(nomeArquivo(setor.nome, 'pdf', agora)));
  };
  const pdfGeral = () => {
    const agora = new Date();
    imprimir(htmlFichas(montarDocumentoFichas(fpe, dados), dataBR(agora)), 'a4', semExtensao(nomeArquivo('geral', 'pdf', agora)));
  };
  const xlsxGeral = async () => {
    setAviso(null);
    try {
      await baixarPlanilha(estado, lerEstadoPop().estado);
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não foi possível gerar a planilha. Tente de novo.' });
    }
  };
  const jsonGeral = () => {
    const agora = new Date();
    baixar(nomeArquivo('geral', 'json', agora), exportarJson(estado, fichas, agora), MIME.json);
  };

  const escolherArquivo = async (arquivo: File | undefined) => {
    setPendente(null);
    setAviso(null);
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setAviso({ tipo: 'erro', texto: 'O arquivo é grande demais para ser uma exportação do FPE.' });
      return;
    }
    let texto: string;
    try {
      texto = await arquivo.text();
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não foi possível ler o arquivo.' });
      return;
    }
    const resultado = importarJson(texto, fichas);
    if (!resultado.ok) {
      setAviso({ tipo: 'erro', texto: resultado.erro });
      return;
    }
    setPendente({ estado: resultado.estado, arquivo: arquivo.name, exportadoEm: resultado.exportadoEm, ignoradas: resultado.ignoradas.length });
  };

  const cancelar = () => {
    setPendente(null);
    setRodada((r) => r + 1);
  };

  const confirmar = () => {
    if (!pendente) return;
    const total = Object.keys(pendente.estado.fpe_edicoes).length;
    const guardou = aoImportar(pendente.estado);
    setPendente(null);
    setRodada((r) => r + 1);
    setAviso({
      tipo: 'ok',
      texto: `Importado: ${plural(total, 'ficha editada', 'fichas editadas')}.${
        edicoesAtuais > 0 && guardou ? ' As edições que você tinha antes ficaram guardadas neste navegador.' : ''
      }${edicoesAtuais > 0 && !guardou ? ' O navegador não guardou cópia das edições anteriores.' : ''}`,
    });
  };

  const dataDoArquivo = pendente?.exportadoEm ? new Date(pendente.exportadoEm) : null;

  return (
    <section className="exportacao" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="exportacao__titulo">
        Exportar e importar
      </h2>
      <p className="exportacao__dica">Os arquivos levam os valores em vigor: o texto original com as suas edições. O PDF abre a impressão do navegador: escolha “Salvar como PDF”.</p>

      <div className="exportacao__grupos">
        <div role="group" aria-label="Fichas do setor" className="exportacao__grupo">
          <p className="exportacao__rotulo">{`Fichas do setor ${setor.nome}`}</p>
          <div className="exportacao__botoes">
            <BotaoExportar formato="md" escopo={`fichas do setor ${setor.nome}`} onExportar={mdSetor} />
            <BotaoExportar formato="pdf" escopo={`fichas do setor ${setor.nome}`} onExportar={pdfSetor} />
          </div>
        </div>
        <div role="group" aria-label="Fichas de todos os setores" className="exportacao__grupo">
          <p className="exportacao__rotulo">Fichas de todos os setores</p>
          <div className="exportacao__botoes">
            <BotaoExportar formato="md" escopo="fichas de todos os setores" onExportar={mdGeral} />
            <BotaoExportar formato="pdf" escopo="fichas de todos os setores" onExportar={pdfGeral} />
          </div>
        </div>
        <div role="group" aria-label="Planilha" className="exportacao__grupo">
          <p className="exportacao__rotulo">Planilha (fichas, bibliotecas e POP geral)</p>
          <div className="exportacao__botoes">
            <BotaoExportar formato="xlsx" escopo={ESCOPO_XLSX} onExportar={() => void xlsxGeral()} />
          </div>
        </div>
        <div role="group" aria-label="Edições do FPE" className="exportacao__grupo">
          <p className="exportacao__rotulo">Edições do FPE (para guardar e restaurar)</p>
          <div className="exportacao__botoes">
            <BotaoExportar formato="json" escopo="as edições do FPE" onExportar={jsonGeral} />
          </div>
        </div>
      </div>

      <div className="exportacao__importar">
        <label htmlFor={idArquivo} className="campo__rotulo">
          Importar edições de um arquivo .json do FPE
        </label>
        <input
          key={rodada}
          id={idArquivo}
          type="file"
          accept=".json,application/json"
          className="exportacao__arquivo"
          onChange={(e) => void escolherArquivo(e.target.files?.[0])}
        />
      </div>

      {pendente && (
        <div role="group" aria-label="Confirmar importação" className="exportacao__confirmar">
          <p>
            {`${pendente.arquivo}: ${plural(Object.keys(pendente.estado.fpe_edicoes).length, 'ficha editada', 'fichas editadas')}`}
            {dataDoArquivo && !Number.isNaN(dataDoArquivo.getTime()) ? `, exportado em ${dataBR(dataDoArquivo)}` : ''}.
            {pendente.ignoradas > 0 && ` ${plural(pendente.ignoradas, 'ficha do arquivo não existe', 'fichas do arquivo não existem')} mais nesta versão e ${pendente.ignoradas === 1 ? 'será ignorada' : 'serão ignoradas'}.`}
          </p>
          <p>
            {edicoesAtuais > 0
              ? `Importar substitui as suas ${plural(edicoesAtuais, 'edição', 'edições')} atuais. Se quiser guardá-las, baixe o .json antes.`
              : 'Você ainda não editou nenhuma ficha: nada será perdido.'}
          </p>
          <div className="exportacao__botoes">
            <Botao variante="primario" onClick={confirmar}>
              Substituir as minhas edições
            </Botao>
            <Botao onClick={cancelar}>Cancelar</Botao>
          </div>
        </div>
      )}

      {aviso && (
        <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`exportacao__aviso exportacao__aviso--${aviso.tipo}`}>
          {aviso.texto}
        </p>
      )}
    </section>
  );
}
