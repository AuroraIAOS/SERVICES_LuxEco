// Tipos do modelo de dados (docs/02_MODELO_DE_DADOS.md). Chaves em snake_case PT-BR.

export type CanalAcao = 'whatsapp_grupo_fluxo';

export interface Fase {
  id: 1 | 2 | 3 | 4;
  nome: string;
}

export type TipoSetor = 'estrategico' | 'interno' | 'externo';

export interface EquipeTecnica {
  nome: string;
  regiao: string;
  empresa?: string;
}

export interface Setor {
  id: string; // "setor_01".."setor_12"
  numero: number;
  nome: string;
  /** chave de cor em design/tokens.json → `setores.<slug>` (a cor em si vive só nos tokens). */
  cor_token: string;
  /** só na V08 (data/conteudo/mmo_v02.json): o que a tela MMO exibe e a planilha não traz. */
  tipo?: TipoSetor;
  tipo_rotulo?: string;
  funcoes?: string[];
  /** equipes terceirizadas por região (Equipe Técnica). */
  equipes?: EquipeTecnica[];
  /** empresas terceirizadas sem região (Engenharia). */
  empresas?: string[];
}

export interface Estagio {
  id: number; // 1..22
  numero: number;
  nome: string;
  fase_id: Fase['id'];
  /** só na V08: o que acontece no estágio (Relatório, alinhado à Matriz). */
  descricao?: string;
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
  /** estágio em que a triagem acontece (Est. 02). */
  estagio_id: number;
}

export interface ClassificacaoLead {
  id: string; // "lead_quente" | "lead_morno" | "lead_frio"
  nome: string;
  criterios: string[];
  estagio_id: number;
}

/** Uma das 10 fases da jornada do cliente (Relatório §6), na perspectiva do cliente. */
export interface JornadaEtapa {
  id: string; // "jornada_01"..
  nome: string;
  descricao: string;
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
  jornada_cliente: JornadaEtapa[];
}

/** Uma das 15 situações IF/ELSE do Mapa (data/conteudo/mapa_condicionais.json), com os textos do Mapa. */
export interface SituacaoMapa {
  id: string; // "sit_01"..
  numero: number;
  nome: string; // a pergunta: “Conta de energia disponível?”
  setor_id: string;
  estagios_mapa: number[];
  estagios_planilha: number[];
  divergencia_estagio: boolean;
  se_sim: string;
  se_nao: string;
  condicionais_ids: string[];
  participantes: { condicional_id: string }[];
}

export interface MapaSituacoes {
  situacoes: SituacaoMapa[];
  sem_situacao: { condicional_id: string }[];
}

// ---------------------------------------------------------------------------------------------
// Fichas 5W1H (docs/02, docs/06 §4): uma por ação (célula) da V08.
// ---------------------------------------------------------------------------------------------

export interface FonteFicha {
  arquivo: string; // caminho em data/fontes/
  trecho: string; // célula, seção ou estágio de onde vem o conteúdo
}

export interface Ficha5w1h {
  id: string; // "ficha_<setor>_<estagio>_<ordem>" (o sufixo do id da ação)
  acao_id: string;
  setor_id: string;
  estagio_id: number;
  what: string;
  why: string;
  where: string;
  when: string;
  who: string;
  how: string;
  /** só no JSON: nunca exibido como selo nas telas nem nos exports (decisão de Max). */
  origem: OrigemConteudo;
  fontes: FonteFicha[];
  atualizado_em: string; // AAAA-MM-DD
}

// ---------------------------------------------------------------------------------------------
// Bibliotecas (docs/02, docs/06 §4): documentos, ferramentas, investimentos (sem valor) e KPIs (sem meta).
// ---------------------------------------------------------------------------------------------

export interface Documento {
  id: string; // "doc_01"..
  nome: string;
  estagio_ids: number[];
  setor_ids: string[];
  origem: OrigemConteudo;
  /** obrigatório quando documentado. */
  fontes?: FonteFicha[];
  /** obrigatório quando sugerido: por que a Lux deveria ter este item. */
  justificativa?: string;
}

export interface Ferramenta {
  id: string; // "fer_01"..
  nome: string;
  setor_ids: string[];
  estagio_ids: number[];
  origem: OrigemConteudo;
  situacao: 'em_uso' | 'temporaria' | 'futura';
  observacao?: string;
  fontes?: FonteFicha[];
  justificativa?: string;
}

export interface Investimento {
  id: string; // "inv_01"..
  categoria: string;
  setor_ids: string[];
  descricao: string;
  /** sempre null no v01: proibido inventar cifra em R$ (docs/06 §4). */
  valor_estimado_brl: null;
  origem: OrigemConteudo;
  fontes?: FonteFicha[];
  justificativa?: string;
}

export type CampoFormularioKpi = 'indicador' | 'periodo' | 'meta' | 'realizado' | 'responsavel' | 'observacoes';

export interface Kpi {
  id: string; // "kpi_<setor>_<n>"
  setor_id: string;
  tipo: 'produtividade' | 'eficiencia';
  nome: string;
  /** fórmula em uma linha. */
  formula_descricao: string;
  /** sempre null no v01: a meta é da Lux. */
  meta: null;
  formulario: CampoFormularioKpi[];
  /** Cemig e Cliente: indicador de acompanhamento (a Lux não controla o setor). */
  acompanhamento?: boolean;
  origem: OrigemConteudo;
  /** ação/estágio da Matriz que sustenta o indicador. */
  fundamento: string;
}

/** data/conteudo/fichas_5w1h.json: as fichas geradas de matriz_v08.json + fichas_autoria.json. */
export interface DocumentoFichas {
  meta: { versao_matriz: string; gerado_de: string[]; fases_autoradas: number[]; total: number };
  fichas: Ficha5w1h[];
}

/** Biblioteca completa (documentos, ferramentas, investimentos, KPIs) como o POP e o XLSX a leem. */
export interface Bibliotecas {
  documentos: Documento[];
  ferramentas: Ferramenta[];
  investimentos: Investimento[];
  kpis: Kpi[];
}

// ---------------------------------------------------------------------------------------------
// POP (docs/06 §5): template fixo de 11 seções; perguntas estratégicas com resposta-padrão; seção 11 jurídica.
// ---------------------------------------------------------------------------------------------

/** Seções do POP que uma pergunta pode alimentar (a 4 vem do glossário e a 11 das observações jurídicas). */
export type SecaoPergunta = 1 | 2 | 3 | 5 | 6 | 7 | 8 | 9 | 10;

export interface PerguntaPop {
  id: string; // "perg_<setor>_<n>"
  setor_id: string;
  secao: SecaoPergunta;
  tema: string;
  pergunta: string;
  /** texto pré-preenchido e editável na tela; só usa o que os documentos dizem. */
  resposta_padrao: string;
  origem: OrigemConteudo;
  fundamento: string;
}

export interface DocumentoPerguntasPop {
  meta: { descricao: string; secoes_alimentadas: number[] };
  perguntas: PerguntaPop[];
}

export interface SecaoTemplatePop {
  numero: number;
  chave: string;
  titulo: string;
}

export interface TermoGlossarioPop {
  termo: string;
  definicao: string;
  /** expressão regular (texto): o termo entra no POP do setor se ela casar com o texto das fichas/documentos dele. Vazio = sempre. */
  busca: string;
}

export interface PopTemplates {
  meta: { descricao: string };
  secoes: SecaoTemplatePop[];
  /** frases de ligação; `{chave}` é substituída por um valor calculado dos dados. */
  textos: Record<string, string>;
  formulario_campos: Record<CampoFormularioKpi, string>;
  glossario: TermoGlossarioPop[];
}

export interface ObservacaoJuridica {
  id: string; // "obs_01"..
  /** diretriz do CEO, reproduzida fielmente. */
  diretriz: string;
  revisar: string;
  /** palavra que tem de aparecer no POP gerado (o validador confere). */
  palavra_chave: string;
}

export interface ObservacoesJuridicasPop {
  meta: { descricao: string };
  aviso: string;
  itens: ObservacaoJuridica[];
}
