import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { estiloDoSetor } from './Cartao';
import { cls } from './identidade';

export interface PilulaProps {
  /** número do estágio (“01”): é uma sequência de verdade, então o número informa. */
  numero?: string;
  nome: string;
  /** texto curto à direita, ex.: “29 ações”. */
  resumo?: string;
  /** nível do título que contém o botão (h3 por padrão). */
  nivel?: 2 | 3 | 4;
  aberta?: boolean;
  aoAlternar?: (aberta: boolean) => void;
  /** `cor_token` do setor: filete lateral permanente na cor dele (o texto continua branco). */
  setor?: string;
  children?: ReactNode;
}

/**
 * Item expansível (estágio, ficha, setor). Padrão de acordeão: o botão vive dentro do título,
 * `aria-expanded` e `aria-controls` dizem o estado; Enter e Espaço alternam (botão nativo).
 * Funciona sem controle externo; passe `aberta`/`aoAlternar` para controlar de fora.
 */
export function Pilula({ numero, nome, resumo, nivel = 3, aberta, aoAlternar, setor, children }: PilulaProps) {
  const [interno, setInterno] = useState(false);
  const idBotao = useId();
  const idPainel = useId();
  const controlada = aberta !== undefined;
  const estaAberta = controlada ? aberta : interno;
  const Titulo = `h${nivel}` as 'h3';

  const alternar = () => {
    if (!controlada) setInterno(!estaAberta);
    aoAlternar?.(!estaAberta);
  };

  return (
    <div className={cls('pilula', estaAberta && 'pilula--aberta', setor && 'pilula--setor')} style={estiloDoSetor(setor)}>
      <Titulo className="pilula__cabecalho">
        <button type="button" id={idBotao} className="pilula__botao" aria-expanded={estaAberta} aria-controls={idPainel} onClick={alternar}>
          {numero && (
            <>
              <span className="pilula__numero">{numero}</span>{' '}
            </>
          )}
          <span className="pilula__nome">{nome}</span>
          {resumo && (
            <>
              {' '}
              <span className="pilula__resumo">{resumo}</span>
            </>
          )}
          <span className="pilula__seta" aria-hidden="true">
            ›
          </span>
        </button>
      </Titulo>
      <div id={idPainel} role="region" aria-labelledby={idBotao} className="pilula__painel" hidden={!estaAberta}>
        {children}
      </div>
    </div>
  );
}
