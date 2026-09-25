// Tipos do modelo de dados (docs/02_MODELO_DE_DADOS.md). Chaves em snake_case PT-BR.

export type CanalAcao = 'whatsapp_grupo_fluxo';

export interface Fase {
  id: 1 | 2 | 3 | 4;
  nome: string;
}

export interface Setor {
  id: string; // "setor_01".."setor_12"
  numero: number;
  nome: string;
  /** chave de cor em design/tokens.json → `setores.<slug>` (a cor em si vive só nos tokens). */
  cor_token: string;
}

export interface Estagio {
  id: number; // 1..22
  numero: number;
  nome: string;
  fase_id: Fase['id'];
}

export interface Acao {
  id: string; // "acao_<setor>_<estagio>_<ordem>"
  setor_id: string;
  estagio_id: number;
  ordem: number; // posição da ação dentro do par setor × estágio (ordem das linhas da planilha)
  texto: string;
  e_condicional: boolean;
  canal?: CanalAcao;
  /** referência da célula na planilha (ex.: "P6") — rastreabilidade do espelho. */
  celula: string;
  /** só nas ações que a V08 acrescenta (docs/06 §3). */
  origem_doc?: string;
}

export interface RamoCondicional {
  rotulo: string; // condição do ramo (ex.: "Conformidade")
  texto: string; // ação consequente (ex.: "informa ao Administrativo")
}

export interface Condicional {
  id: string;
  acao_id: string;
  /** texto-base da ação (a "pergunta" implícita da célula IF/ELSE). */
  pergunta: string;
  se_sim: RamoCondicional; // 1º ramo da célula
  se_nao: RamoCondicional; // 2º ramo da célula
  situacao_id?: string;
}

export interface Matriz {
  meta: {
    fonte: string;
    versao_matriz: string;
    leitura_encerra_em: string;
  };
  fases: Fase[];
  setores: Setor[];
  estagios: Estagio[];
  acoes: Acao[];
  condicionais: Condicional[];
}

export const FASES: Fase[] = [
  { id: 1, nome: 'Comercial' },
  { id: 2, nome: 'Técnica/Projeto' },
  { id: 3, nome: 'Execução' },
  { id: 4, nome: 'Homologação e Encerramento' },
];

/** Estágio → fase, conforme o plano (Comercial 01–09, Técnica 10–14, Execução 15–19, Homologação 20–22). */
export function faseDoEstagio(estagio: number): Fase['id'] {
  if (estagio <= 9) return 1;
  if (estagio <= 14) return 2;
  if (estagio <= 19) return 3;
  return 4;
}

// ---------------------------------------------------------------------------------------------
// V08 = V07 + overlay das Anotações do CEO (docs/06 §3). Acrescenta; nunca altera o que a V07 tem.
// ---------------------------------------------------------------------------------------------

export type OrigemConteudo = 'documentado' | 'sugerido' | 'manual';
export type PrioridadeOportunidade = 'alta' | 'media' | 'baixa';

export interface PerfilCliente {
  id: string; // "perfil_01"..
  nome: string;
  criterios: string;
  proxima_acao: string;
}

export interface ClassificacaoLead {
  id: string; // "lead_quente" | "lead_morno" | "lead_frio"
  nome: string;
  criterios: string[];
}

export interface Oportunidade {
  id: string; // "oport_01"..
  nome: string;
  prioridade_padrao: PrioridadeOportunidade;
  estagio_id: number;
  origem: OrigemConteudo;
}

export interface RespostaPadrao {
  id: string; // "resp_01"..
  tema: string;
  texto: string;
  /** diretriz do CEO reproduzida fielmente e listada na seção “Observações para revisão jurídica”. */
  revisao_juridica: boolean;
}

export interface MatrizV08 extends Omit<Matriz, 'meta'> {
  meta: Matriz['meta'] & {
    base_v07: string;
    overlay: string;
    origem_doc: string;
  };
  perfis_cliente: PerfilCliente[];
  classificacao_lead: ClassificacaoLead[];
  oportunidades: Oportunidade[];
  respostas_padrao: RespostaPadrao[];
}
