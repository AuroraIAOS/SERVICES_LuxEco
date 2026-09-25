// As 236 fichas 5W1H (data/conteudo/fichas_5w1h.json). Arquivo separado de matriz.ts para a tela FPE carregá-lo sob demanda.
import fichasJson from '../../data/conteudo/fichas_5w1h.json' with { type: 'json' };
import type { DocumentoFichas } from './tipos.ts';

export const DOCUMENTO_FICHAS = fichasJson as unknown as DocumentoFichas;
