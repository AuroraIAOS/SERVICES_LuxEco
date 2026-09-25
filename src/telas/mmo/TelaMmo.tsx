import { useMemo } from 'react';
import type { MapaSituacoes, MatrizV08 } from '../../dados/tipos';
import { Numeros, Tela } from '../../ui';
import { CicloDeServico } from './CicloDeServico';
import { MAPA_SITUACOES, MATRIZ_V08 } from './dados';
import { montarMmo } from './modelo';
import { SecaoDecisoes } from './SecaoDecisoes';
import { SecaoJornada } from './SecaoJornada';
import { SecaoSetores } from './SecaoSetores';

/**
 * MMO: mapa da operação em painel (não radial), renderizado da Matriz V08.
 * Hero com números calculados → ciclo de serviço (4 fases, 22 estágios) → setores → decisões IF/ELSE → jornada do cliente.
 * `dados` e `mapa` existem para os testes; a tela real usa os JSON versionados.
 */
export function TelaMmo({ dados = MATRIZ_V08, mapa = MAPA_SITUACOES }: { dados?: MatrizV08; mapa?: MapaSituacoes }) {
  const mmo = useMemo(() => montarMmo(dados, mapa), [dados, mapa]);
  return (
    <Tela titulo="MMO" subtitulo="Mapa Mental Organizacional" resumo={<Numeros itens={mmo.numeros} />}>
      <CicloDeServico fases={mmo.fases} />
      <SecaoSetores setores={mmo.setores} totalEstagios={dados.estagios.length} />
      <SecaoDecisoes decisoes={mmo.decisoes} />
      <SecaoJornada etapas={mmo.jornada} />
    </Tela>
  );
}
