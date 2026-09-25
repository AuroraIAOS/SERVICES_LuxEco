// Carrega os JSON versionados que as telas leem. Fonte única: nenhuma tela guarda número, lista ou texto de negócio no código.
// Import com atributo JSON e extensão .ts: esta pasta compila nos dois projetos TypeScript (app e node), como src/fluxograma/raias.ts.
import mapaJson from '../../data/conteudo/mapa_condicionais.json' with { type: 'json' };
import matrizJson from '../../data/matriz_v08.json' with { type: 'json' };
import type { MapaSituacoes, MatrizV08 } from './tipos.ts';

export const MATRIZ_V08 = matrizJson as unknown as MatrizV08;
export const MAPA_SITUACOES = mapaJson as unknown as MapaSituacoes;
