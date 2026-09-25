import { useState } from 'react';
import { Pilula } from '../../ui';
import { Secao, listaEmTexto } from './Secao';
import type { SetorVisual } from './modelo';

/** Os 12 setores em cartões expansíveis: um aberto por vez (como no MMO_v01). */
export function SecaoSetores({ setores, totalEstagios }: { setores: SetorVisual[]; totalEstagios: number }) {
  const [aberto, setAberto] = useState<string | null>(null);
  return (
    <Secao titulo={`Os ${setores.length} setores`} dica="Abra um setor para ver as funções dele e em quais estágios atua.">
      <div className="setores-grade">
        {setores.map((s) => (
          <Pilula
            key={s.setor.id}
            numero={`S${String(s.setor.numero).padStart(2, '0')}`}
            nome={s.setor.nome}
            resumo={s.setor.tipo_rotulo}
            nivel={3}
            setor={s.setor.cor_token}
            aberta={aberto === s.setor.id}
            aoAlternar={(abrir) => setAberto(abrir ? s.setor.id : null)}
          >
            <div className="setor-detalhe">
              <ul className="funcoes">
                {(s.setor.funcoes ?? []).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="setor-detalhe__atuacao">
                Atua em {s.estagios.length} de {totalEstagios} estágios: {s.estagiosTexto}.
              </p>
              {s.equipesPorRegiao.length > 0 && (
                <p className="setor-detalhe__equipes">Equipes: {s.equipesPorRegiao.map((r) => `${r.regiao}: ${listaEmTexto(r.equipes)}`).join('; ')}.</p>
              )}
              {s.setor.empresas && s.setor.empresas.length > 0 && <p className="setor-detalhe__equipes">Empresas: {listaEmTexto(s.setor.empresas)}.</p>}
            </div>
          </Pilula>
        ))}
      </div>
    </Secao>
  );
}
