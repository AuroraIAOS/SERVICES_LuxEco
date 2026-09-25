// Documento de texto das fichas 5W1H (valores EM VIGOR: padrão + edições). Uma só estrutura alimenta o .md e o PDF.
// Sem selo de proveniência: não distingue ficha editada de ficha original (decisão de Max).
import type { MatrizV08 } from '../dados/tipos';
import { CAMPOS_FICHA } from '../estado/armazenamento';
import type { Fpe } from '../telas/fpe/modelo';
import { CAMPOS } from '../telas/fpe/modelo';

export interface CampoDoc {
  rotulo: string;
  valor: string;
}
export interface FichaDoc {
  titulo: string;
  ifElse: boolean;
  campos: CampoDoc[];
}
export interface EstagioDoc {
  titulo: string;
  fichas: FichaDoc[];
}
export interface FaseDoc {
  titulo: string;
  estagios: EstagioDoc[];
}
export interface SetorDoc {
  nome: string;
  fases: FaseDoc[];
}
export interface DocumentoFichasTexto {
  titulo: string;
  /** o que o documento cobre: um setor ou todos. */
  escopo: 'setor' | 'geral';
  setores: SetorDoc[];
}

const umaLinha = (t: string) => t.replace(/\s+/g, ' ').trim();
/** Campo em branco não some do documento: mostra o travessão. */
export const valorOuTravessao = (v: string) => (v.trim() === '' ? '—' : v);

/**
 * `setorId` = um setor; `undefined` = todos os setores, na ordem da Matriz.
 * As fichas de cada estágio seguem a ordem da planilha (a mesma da tela).
 */
export function montarDocumentoFichas(fpe: Fpe, matriz: MatrizV08, setorId?: string): DocumentoFichasTexto {
  const nomeFase = new Map(matriz.fases.map((f) => [f.id, f.nome]));
  const setoresFpe = setorId === undefined ? fpe.setores : fpe.setores.filter((s) => s.setor.id === setorId);
  if (setorId !== undefined && setoresFpe.length === 0) throw new Error(`Setor "${setorId}" sem fichas`);

  const setores: SetorDoc[] = setoresFpe.map((s) => {
    const fases: FaseDoc[] = [];
    for (const e of s.estagios) {
      const tituloFase = `Fase ${e.estagio.fase_id} — ${nomeFase.get(e.estagio.fase_id) ?? ''}`;
      let fase = fases.at(-1);
      if (fase?.titulo !== tituloFase) {
        fase = { titulo: tituloFase, estagios: [] };
        fases.push(fase);
      }
      fase.estagios.push({
        titulo: `Estágio ${e.numero} — ${e.estagio.nome}`,
        fichas: e.fichas.map((f, i) => ({
          titulo: `${i + 1}. ${umaLinha(f.valores.what) || umaLinha(f.padrao.what)}`,
          ifElse: f.ifElse,
          campos: CAMPOS_FICHA.map((c) => ({ rotulo: CAMPOS[c].rotulo, valor: f.valores[c] })),
        })),
      });
    }
    return { nome: s.setor.nome, fases };
  });

  return {
    titulo: setorId === undefined ? 'FPE — fichas 5W1H de todos os setores' : `FPE — fichas 5W1H do setor ${setores[0]?.nome ?? ''}`,
    escopo: setorId === undefined ? 'geral' : 'setor',
    setores,
  };
}
