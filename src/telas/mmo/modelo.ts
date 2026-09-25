// Modelo de visão do MMO: transforma a Matriz V08 (data/matriz_v08.json) no que a tela desenha.
// Puro (sem React): nenhum número, lista ou texto de negócio mora na tela — tudo vem do JSON e é calculado aqui.
import type { Acao, ClassificacaoLead, Condicional, Estagio, Fase, JornadaEtapa, MapaSituacoes, MatrizV08, Oportunidade, PerfilCliente, RamoCondicional, Setor } from '../../dados/tipos';
import { FASES } from '../../dados/tipos';

export interface NumeroMmo {
  valor: number;
  rotulo: string;
}

export interface AcaoVisual {
  acao: Acao;
  /** texto para exibir: sem o marcador “(GRUPO DE FLUXO)” da planilha (a etiqueta WhatsApp já diz). */
  texto: string;
  whatsapp: boolean;
  condicional?: Condicional;
}

export interface BlocoSetor {
  setor: Setor;
  acoes: AcaoVisual[];
}

export interface EstagioVisual {
  estagio: Estagio;
  /** “02” */
  numero: string;
  totalAcoes: number;
  blocos: BlocoSetor[];
  perfis: PerfilCliente[];
  leads: ClassificacaoLead[];
  oportunidades: Oportunidade[];
}

export interface FaseVisual {
  fase: Fase;
  estagios: EstagioVisual[];
  totalAcoes: number;
}

export interface SetorVisual {
  setor: Setor;
  /** estágios em que o setor tem célula na Matriz (a Matriz vence o Mapa: docs/06 §2). */
  estagios: number[];
  /** “01 a 03 e 22” */
  estagiosTexto: string;
  totalAcoes: number;
  /** equipes por região (Equipe Técnica), na ordem em que aparecem nos dados. */
  equipesPorRegiao: { regiao: string; equipes: string[] }[];
}

export interface DecisaoVisual {
  chave: string;
  /** “Est. 02” ou “Est. 15 e 17” */
  estagiosTexto: string;
  setorNome: string;
  setorCor: string;
  pergunta: string;
  sim: RamoCondicional;
  nao: RamoCondicional;
}

export interface Mmo {
  versao: string;
  numeros: NumeroMmo[];
  fases: FaseVisual[];
  setores: SetorVisual[];
  decisoes: {
    /** as 15 situações do Mapa (cada uma com a célula de vínculo direto na Matriz). */
    situacoes: DecisaoVisual[];
    /** as IF/ELSE que a V08 acrescenta no atendimento e no pós-venda (sem situação no Mapa). */
    atendimento: DecisaoVisual[];
  };
  jornada: JornadaEtapa[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Remove o marcador da planilha nas células do Grupo de Fluxo (a etiqueta WhatsApp o substitui). */
export const textoDaAcao = (a: Acao): string => (a.canal === 'whatsapp_grupo_fluxo' ? a.texto.replace(/\s*\(GRUPO DE FLUXO\)\s*$/i, '').trim() : a.texto);

/** [1,2,3,22] → “01 a 03 e 22”; [15,16,17,19,22] → “15 a 17, 19 e 22”; [3,4] → “03 e 04”. Sequência de 3 ou mais vira “a”. */
export function formatarEstagios(ids: readonly number[]): string {
  const ordenados = [...new Set(ids)].sort((a, b) => a - b);
  if (ordenados.length === 0) return '';
  const grupos: number[][] = [];
  for (const id of ordenados) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && id === ultimo[ultimo.length - 1]! + 1) ultimo.push(id);
    else grupos.push([id]);
  }
  const partes = grupos.flatMap((g) => (g.length >= 3 ? [`${pad2(g[0]!)} a ${pad2(g[g.length - 1]!)}`] : g.map(pad2)));
  return partes.length === 1 ? partes[0]! : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]!}`;
}

export function montarMmo(v08: MatrizV08, mapa: MapaSituacoes): Mmo {
  const setorPorId = new Map(v08.setores.map((s) => [s.id, s]));
  const condicionalPorAcao = new Map(v08.condicionais.map((c) => [c.acao_id, c]));
  const condicionalPorId = new Map(v08.condicionais.map((c) => [c.id, c]));
  const acaoPorId = new Map(v08.acoes.map((a) => [a.id, a]));

  const acoesDoEstagio = (id: number) => v08.acoes.filter((a) => a.estagio_id === id).sort((x, y) => x.ordem - y.ordem);

  // Hero: tudo calculado dos dados.
  const equipesTecnicas = v08.setores.find((s) => s.id === 'setor_10')?.equipes ?? [];
  const regioes = new Set(v08.setores.flatMap((s) => (s.equipes ?? []).map((q) => q.regiao)));
  const numeros: NumeroMmo[] = [
    { valor: v08.setores.length, rotulo: 'setores' },
    { valor: v08.estagios.length, rotulo: 'estágios' },
    { valor: v08.acoes.length, rotulo: 'ações' },
    { valor: v08.condicionais.length, rotulo: 'decisões IF/ELSE' },
    ...(equipesTecnicas.length ? [{ valor: equipesTecnicas.length, rotulo: 'equipes técnicas' }] : []),
    ...(regioes.size ? [{ valor: regioes.size, rotulo: regioes.size === 1 ? 'região' : 'regiões' }] : []),
  ];

  const fases: FaseVisual[] = FASES.map((fase) => {
    const estagios: EstagioVisual[] = v08.estagios
      .filter((e) => e.fase_id === fase.id)
      .map((estagio) => {
        const acoes = acoesDoEstagio(estagio.id);
        const blocos: BlocoSetor[] = v08.setores
          .map((setor) => ({
            setor,
            acoes: acoes
              .filter((a) => a.setor_id === setor.id)
              .map((acao): AcaoVisual => ({ acao, texto: textoDaAcao(acao), whatsapp: acao.canal === 'whatsapp_grupo_fluxo', condicional: condicionalPorAcao.get(acao.id) })),
          }))
          .filter((b) => b.acoes.length > 0);
        return {
          estagio,
          numero: pad2(estagio.numero),
          totalAcoes: acoes.length,
          blocos,
          perfis: v08.perfis_cliente.filter((p) => p.estagio_id === estagio.id),
          leads: v08.classificacao_lead.filter((l) => l.estagio_id === estagio.id),
          oportunidades: v08.oportunidades.filter((o) => o.estagio_id === estagio.id),
        };
      });
    return { fase, estagios, totalAcoes: estagios.reduce((soma, e) => soma + e.totalAcoes, 0) };
  });

  const setores: SetorVisual[] = v08.setores.map((setor) => {
    const dele = v08.acoes.filter((a) => a.setor_id === setor.id);
    const estagios = [...new Set(dele.map((a) => a.estagio_id))].sort((a, b) => a - b);
    const porRegiao = new Map<string, string[]>();
    for (const q of setor.equipes ?? []) porRegiao.set(q.regiao, [...(porRegiao.get(q.regiao) ?? []), q.nome]);
    return {
      setor,
      estagios,
      estagiosTexto: formatarEstagios(estagios),
      totalAcoes: dele.length,
      equipesPorRegiao: [...porRegiao].map(([regiao, equipes]) => ({ regiao, equipes })),
    };
  });

  const decisaoDe = (chave: string, estagios: number[], setorId: string, pergunta: string, c: Condicional): DecisaoVisual => {
    const setor = setorPorId.get(setorId);
    return {
      chave,
      estagiosTexto: `Est. ${formatarEstagios(estagios)}`,
      setorNome: setor?.nome ?? setorId,
      setorCor: setor?.cor_token ?? '',
      pergunta,
      sim: c.se_sim,
      nao: c.se_nao,
    };
  };

  const situacoes: DecisaoVisual[] = [...mapa.situacoes]
    .sort((a, b) => a.numero - b.numero)
    .flatMap((s) => {
      const c = condicionalPorId.get(s.condicionais_ids[0] ?? '');
      return c ? [decisaoDe(s.id, s.estagios_planilha, s.setor_id, s.nome, c)] : [];
    });

  const atendimento: DecisaoVisual[] = v08.condicionais
    .filter((c) => !c.situacao_id && acaoPorId.get(c.acao_id)?.origem_doc)
    .map((c) => {
      const a = acaoPorId.get(c.acao_id)!;
      return decisaoDe(c.id, [a.estagio_id], a.setor_id, c.pergunta, c);
    });

  return { versao: v08.meta.versao_matriz, numeros, fases, setores, decisoes: { situacoes, atendimento }, jornada: v08.jornada_cliente };
}
