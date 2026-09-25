import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cls } from './identidade';

export type VarianteBotao = 'primario' | 'secundario' | 'discreto';

export interface BotaoProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variante?: VarianteBotao;
  /** `button` por padrão: um botão dentro de <form> não envia o formulário sem querer. */
  tipo?: 'button' | 'submit' | 'reset';
}

/** Ação da tela. Área de toque ≥ 44px; foco amarelo vem do estilo global. */
export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante = 'secundario', tipo = 'button', className, children, ...resto },
  ref,
) {
  return (
    <button ref={ref} type={tipo} className={cls('botao', `botao--${variante}`, className)} {...resto}>
      {children}
    </button>
  );
});

/** Link de navegação com a aparência de botão (troca de tela, sem recarregar). */
export function BotaoLink({ para, variante = 'secundario', children }: { para: string; variante?: VarianteBotao; children: ReactNode }) {
  return (
    <Link to={para} className={cls('botao', `botao--${variante}`)}>
      {children}
    </Link>
  );
}

export type FormatoExportacao = 'json' | 'md' | 'mermaid' | 'pdf' | 'docx' | 'xlsx';

const NOME_DO_FORMATO: Record<FormatoExportacao, string> = {
  json: 'JSON',
  md: 'Markdown',
  mermaid: 'Mermaid',
  pdf: 'PDF',
  docx: 'Word',
  xlsx: 'Excel',
};

/**
 * Botão de exportação. O texto visível é a extensão (“.md”) e o nome acessível a repete (“Exportar … em Markdown (.md)”),
 * para que quem usa leitor de tela saiba o que será baixado e de qual escopo.
 */
export function BotaoExportar({
  formato,
  escopo,
  onExportar,
  desabilitado = false,
}: {
  formato: FormatoExportacao;
  /** o que será exportado, em palavras do usuário: “fluxo do setor Vendas”, “fichas da Fase 1”. */
  escopo: string;
  onExportar: () => void;
  desabilitado?: boolean;
}) {
  const extensao = `.${formato}`;
  return (
    <Botao
      variante="secundario"
      onClick={onExportar}
      disabled={desabilitado}
      aria-label={`Exportar ${escopo} em ${NOME_DO_FORMATO[formato]} (${extensao})`}
    >
      {extensao}
    </Botao>
  );
}
