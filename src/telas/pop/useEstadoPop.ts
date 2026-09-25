import { useCallback, useRef, useState } from 'react';
import type { ArmazenamentoTexto } from '../../estado/armazenamento';
import { armazenamentoDoNavegador } from '../../estado/armazenamento';
import type { EstadoPop } from '../../estado/pop';
import { editarResposta, gravarEstadoPop, lerEstadoPop, restaurarResposta } from '../../estado/pop';

export interface EstadoDoPop {
  estado: EstadoPop;
  /** `false` quando o navegador não guarda (janela privada, cota cheia): as respostas valem só até fechar a página. */
  persistindo: boolean;
  responder: (perguntaId: string, padrao: string, texto: string) => void;
  restaurar: (perguntaId: string) => void;
}

/**
 * Respostas do POP com persistência a cada mudança. `armazenamento` só é lido uma vez (na montagem);
 * `undefined` = localStorage do navegador, `null` = sem storage (tudo em memória).
 */
export function useEstadoPop(armazenamento?: ArmazenamentoTexto | null): EstadoDoPop {
  const [storage] = useState<ArmazenamentoTexto | null>(() => (armazenamento === undefined ? armazenamentoDoNavegador() : armazenamento));
  const [inicial] = useState(() => lerEstadoPop(storage));
  const [estado, setEstado] = useState<EstadoPop>(inicial.estado);
  const [persistindo, setPersistindo] = useState(inicial.origem !== 'indisponivel');
  // A digitação é rápida: sempre parte do estado mais recente, não de um valor capturado na renderização.
  const atual = useRef(inicial.estado);

  const aplicar = useCallback(
    (proximo: EstadoPop) => {
      if (proximo === atual.current) return;
      atual.current = proximo;
      setEstado(proximo);
      setPersistindo(gravarEstadoPop(proximo, storage));
    },
    [storage],
  );

  const responder = useCallback((id: string, padrao: string, texto: string) => aplicar(editarResposta(atual.current, id, padrao, texto, new Date().toISOString())), [aplicar]);
  const restaurar = useCallback((id: string) => aplicar(restaurarResposta(atual.current, id)), [aplicar]);

  return { estado, persistindo, responder, restaurar };
}
