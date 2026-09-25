// Fonte única de dados do MMO: data/matriz_v08.json (+ o Mapa, só para as 15 situações IF/ELSE).
// Nenhuma tela guarda número, lista ou texto de negócio no código: tudo vem destes arquivos.
import mapaJson from '../../../data/conteudo/mapa_condicionais.json';
import matrizJson from '../../../data/matriz_v08.json';
import type { MapaSituacoes, MatrizV08 } from '../../dados/tipos';

export const MATRIZ_V08 = matrizJson as unknown as MatrizV08;
export const MAPA_SITUACOES = mapaJson as unknown as MapaSituacoes;
