import { useMemo, useState } from 'react';
import { DOCUMENTO_FICHAS } from '../../dados/fichas';
import { MATRIZ_V08 } from '../../dados/matriz';
import type { DocumentoFichas, MatrizV08 } from '../../dados/tipos';
import type { ArmazenamentoTexto } from '../../estado/armazenamento';
import { Numeros, Tela } from '../../ui';
import { FormularioFicha } from './FormularioFicha';
import { matrizComEdicoes, montarFpe, resolverSelecao } from './modelo';
import type { Selecao } from './modelo';
import { NavegacaoFpe } from './NavegacaoFpe';
import { PainelExportacao } from './PainelExportacao';
import { PainelFluxograma } from './PainelFluxograma';
import { useEstadoFpe } from './useEstadoFpe';

/**
 * FPE: formulário 5W1H pré-preenchido (236 fichas), editável e guardado no navegador, e o fluxograma gerado das fichas.
 * `dados`, `fichas` e `armazenamento` existem para os testes; a tela real usa os JSON versionados e o localStorage.
 */
export function TelaFpe({ dados = MATRIZ_V08, fichas = DOCUMENTO_FICHAS, armazenamento }: { dados?: MatrizV08; fichas?: DocumentoFichas; armazenamento?: ArmazenamentoTexto | null }) {
  const { estado, persistindo, revisao, editar, restaurar, substituir, importacoes } = useEstadoFpe(armazenamento);
  const fpe = useMemo(() => montarFpe(dados, fichas, estado), [dados, fichas, estado]);
  const matrizEfetiva = useMemo(() => matrizComEdicoes(dados, fichas, estado), [dados, fichas, estado]);
  const [pedido, setPedido] = useState<Partial<Selecao>>({});
  const selecao = resolverSelecao(fpe, pedido);

  const setor = fpe.setores.find((s) => s.setor.id === selecao?.setorId);
  const estagio = setor?.estagios.find((e) => e.estagio.id === selecao?.estagioId);
  const ficha = estagio?.fichas.find((f) => f.ficha.id === selecao?.fichaId);

  // Trocar de setor ou estágio recomeça a escolha do nível seguinte (a resolução cai no primeiro item).
  const selecionar = (proxima: Partial<Selecao>) => setPedido(proxima);

  return (
    <Tela
      titulo="FPE"
      subtitulo="Formulário 5W1H e fluxograma"
      resumo={
        <Numeros
          itens={[
            { valor: fpe.totalFichas, rotulo: 'fichas' },
            { valor: fpe.totalEditadas, rotulo: fpe.totalEditadas === 1 ? 'editada' : 'editadas' },
            { valor: fpe.setores.length, rotulo: 'setores' },
          ]}
        />
      }
    >
      {!persistindo && (
        <p role="status" className="fpe-aviso">
          Este navegador não deixou guardar as suas edições. Elas valem só até você fechar a página: baixe o que precisar antes de sair.
        </p>
      )}
      {selecao && setor && estagio && ficha ? (
        <>
          <NavegacaoFpe fpe={fpe} selecao={selecao} aoSelecionar={selecionar} />
          <FormularioFicha
            key={`${ficha.ficha.id}#${importacoes}`}
            setor={setor.setor}
            estagio={estagio.estagio}
            ficha={ficha}
            aoEditar={(campo, valor) => editar(ficha.ficha.id, ficha.padrao, campo, valor)}
            aoRestaurar={() => restaurar(ficha.ficha.id)}
          />
          <PainelFluxograma matriz={matrizEfetiva} setor={setor.setor} faseSugerida={estagio.estagio.fase_id} revisao={revisao} />
          <PainelExportacao fpe={fpe} dados={dados} fichas={fichas} estado={estado} setor={setor.setor} aoImportar={substituir} />
        </>
      ) : (
        <p>Nenhuma ficha para mostrar.</p>
      )}
    </Tela>
  );
}
