import { useState } from 'react';
import { baixarBytes, MIME, nomeArquivoPop } from '../../exportar/baixar';
import { imprimirPop } from '../../exportar/pop_pdf';
import { baixarPlanilha, ESCOPO_XLSX } from '../../exportar/xlsx_botao';
import type { EstadoFpe } from '../../estado/armazenamento';
import type { EstadoPop } from '../../estado/pop';
import type { Pop } from '../../pop/gerar';
import { BotaoExportar } from '../../ui';

const dataBR = (d: Date) => d.toLocaleDateString('pt-BR');

/**
 * Exportar o POP gerado em Word (.docx) e PDF (A4, pela impressão do navegador) e a planilha completa (.xlsx: fichas, bibliotecas e POP geral).
 * O que está na tela é o que sai.
 * A biblioteca do Word só é carregada quando a pessoa pede o .docx.
 */
export function PainelExportacaoPop({ pop, estadoFpe, estadoPop }: { pop: Pop; estadoFpe: EstadoFpe; estadoPop: EstadoPop }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const escopo = pop.escopo === 'geral' ? 'POP geral' : `${pop.titulo}`;
  const nomeBase = pop.escopo === 'geral' ? 'geral' : pop.titulo.replace(/^POP — /, '');

  const docx = async () => {
    setAviso(null);
    try {
      const agora = new Date();
      const { gerarDocx } = await import('../../exportar/pop_docx');
      baixarBytes(nomeArquivoPop(nomeBase, 'docx', agora), await gerarDocx(pop, dataBR(agora)), MIME.docx);
    } catch {
      setAviso('Não foi possível gerar o arquivo Word. Tente de novo; se repetir, use o PDF.');
    }
  };
  const xlsx = async () => {
    setAviso(null);
    try {
      await baixarPlanilha(estadoFpe, estadoPop);
    } catch {
      setAviso('Não foi possível gerar a planilha. Tente de novo.');
    }
  };
  const pdf = () => {
    const agora = new Date();
    imprimirPop(pop, dataBR(agora), nomeArquivoPop(nomeBase, 'pdf', agora).replace(/\.pdf$/, ''));
  };

  return (
    <section className="pop-exportar" aria-label="Exportar o POP">
      <h3 className="pop-exportar__titulo">Exportar</h3>
      <div className="pop-acoes">
        <BotaoExportar formato="docx" escopo={escopo} onExportar={docx} />
        <BotaoExportar formato="pdf" escopo={escopo} onExportar={pdf} />
        <BotaoExportar formato="xlsx" escopo={ESCOPO_XLSX} onExportar={() => void xlsx()} />
      </div>
      {aviso && (
        <p role="alert" className="pop-aviso">
          {aviso}
        </p>
      )}
    </section>
  );
}
