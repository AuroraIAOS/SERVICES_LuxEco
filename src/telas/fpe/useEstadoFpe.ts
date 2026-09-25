import { useCallback, useRef, useState } from 'react';
import type { ArmazenamentoTexto, CampoFicha, EstadoFpe, ValoresFicha } from '../../estado/armazenamento';
import { armazenamentoDoNavegador, editarCampo, gravarEstadoFpe, guardarCopiaAntesDeImportar, lerEstadoFpe, restaurarFicha } from '../../estado/armazenamento';

export interface EstadoDoFpe {
  estado: EstadoFpe;
  /** `false` quando o navegador não guarda (janela privada, cota cheia): as edições valem só até fechar a página. */
  persistindo: boolean;
  /** sobe a cada edição ou restauração: o painel do fluxograma usa para avisar que ele ficou desatualizado. */
  revisao: number;
  editar: (fichaId: string, padrao: ValoresFicha, campo: CampoFicha, valor: string) => void;
  restaurar: (fichaId: string) => void;
  /** troca o estado inteiro (importação de JSON). Guarda antes uma cópia do estado atual; devolve `false` se o navegador recusou a cópia. */
  substituir: (novo: EstadoFpe) => boolean;
  /** sobe a cada importação: o formulário monta de novo, porque o estado mudou por fora do que ele digitou. */
  importacoes: number;
}

/**
 * Estado do FPE com persistência a cada mudança. `armazenamento` só é lido uma vez (na montagem);
 * `undefined` = localStorage do navegador, `null` = sem storage (tudo em memória).
 */
export function useEstadoFpe(armazenamento?: ArmazenamentoTexto | null): EstadoDoFpe {
  const [storage] = useState<ArmazenamentoTexto | null>(() => (armazenamento === undefined ? armazenamentoDoNavegador() : armazenamento));
  const [inicial] = useState(() => lerEstadoFpe(storage));
  const [estado, setEstado] = useState<EstadoFpe>(inicial.estado);
  const [persistindo, setPersistindo] = useState(inicial.origem !== 'indisponivel');
  const [revisao, setRevisao] = useState(0);
  const [importacoes, setImportacoes] = useState(0);
  // A digitação é rápida: sempre parte do estado mais recente, não de um valor capturado na renderização.
  const atual = useRef(inicial.estado);

  const aplicar = useCallback(
    (proximo: EstadoFpe) => {
      if (proximo === atual.current) return; // nada mudou (ex.: restaurar uma ficha que não foi editada)
      atual.current = proximo;
      setEstado(proximo);
      setRevisao((r) => r + 1);
      setPersistindo(gravarEstadoFpe(proximo, storage));
    },
    [storage],
  );

  const editar = useCallback(
    (fichaId: string, padrao: ValoresFicha, campo: CampoFicha, valor: string) => aplicar(editarCampo(atual.current, fichaId, padrao, campo, valor, new Date().toISOString())),
    [aplicar],
  );
  const restaurar = useCallback((fichaId: string) => aplicar(restaurarFicha(atual.current, fichaId)), [aplicar]);

  const substituir = useCallback(
    (novo: EstadoFpe) => {
      const copiado = guardarCopiaAntesDeImportar(atual.current, storage);
      aplicar(novo);
      setImportacoes((n) => n + 1);
      return copiado;
    },
    [aplicar, storage],
  );

  return { estado, persistindo, revisao, editar, restaurar, substituir, importacoes };
}
