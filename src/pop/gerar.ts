// Gerador do POP por template, sem LLM (03.1). Puro (sem React): dados → estrutura de seções → tela, .docx e PDF (03.2).
// Ordem e títulos das 11 seções vêm de data/conteudo/pop_templates.json; o conteúdo vem das fichas em vigor (FPE), da Matriz,
// das bibliotecas e das respostas das perguntas estratégicas. Nada é inventado: sem dado, o texto diz que a Lux informa.
import type { Bibliotecas, MatrizV08, ObservacoesJuridicasPop, PerguntaPop, PopTemplates, Setor } from '../dados/tipos';
import type { Fpe, SetorFpe } from '../telas/fpe/modelo';
import { CAMPOS } from '../telas/fpe/modelo';

export interface Passo {
  numero: number;
  texto: string;
  ifElse: boolean;
  detalhes: { rotulo: string; valor: string }[];
}

export type Bloco =
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'passos'; passos: Passo[] }
  | { tipo: 'tabela'; colunas: string[]; linhas: string[][] }
  | { tipo: 'respostas'; itens: { pergunta: string; resposta: string }[] }
  | { tipo: 'aviso'; texto: string };

export interface SecaoPop {
  numero: number;
  chave: string;
  titulo: string;
  blocos: Bloco[];
}

export interface Pop {
  escopo: 'setor' | 'geral';
  setorId: string | null;
  titulo: string;
  subtitulo: string;
  secoes: SecaoPop[];
}

export type EscopoPop = { tipo: 'setor'; setorId: string } | { tipo: 'geral' };

export interface EntradaPop {
  v08: MatrizV08;
  /** as fichas com as edições em vigor (`montarFpe`). */
  fpe: Fpe;
  bibliotecas: Bibliotecas;
  perguntas: PerguntaPop[];
  templates: PopTemplates;
  observacoes: ObservacoesJuridicasPop;
  /** respostas editadas por `pergunta.id`; sem entrada vale a resposta-padrão. */
  respostas?: Record<string, string>;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const unicos = <T>(xs: T[]) => [...new Set(xs)];

/** Troca `{chave}` pelo valor; chave sem valor é erro (o template e o gerador andam juntos). */
function preencher(modelo: string, valores: Record<string, string | number>): string {
  return modelo.replace(/\{(\w+)\}/g, (_, chave: string) => {
    const v = valores[chave];
    if (v === undefined) throw new Error(`POP: o texto “${modelo}” usa {${chave}}, que o gerador não informa.`);
    return String(v);
  });
}

/** Resposta em vigor (editada ou padrão); vazia = a pergunta não entra no POP. */
export const respostaEmVigor = (p: PerguntaPop, respostas?: Record<string, string>) => (respostas?.[p.id] ?? p.resposta_padrao).trim();

/** Um bloco por setor quando o POP é geral; direto quando é de um setor só. */
function porSetor(setores: SetorFpe[], agrupar: boolean, montar: (s: SetorFpe) => Bloco[]): Bloco[] {
  if (!agrupar) return setores.flatMap(montar);
  return setores.flatMap((s) => [{ tipo: 'subtitulo', texto: s.setor.nome } as Bloco, ...montar(s)]);
}

export function gerarPop(escopo: EscopoPop, entrada: EntradaPop): Pop {
  const { v08, fpe, bibliotecas, perguntas, templates, observacoes, respostas } = entrada;
  const t = templates.textos;
  const texto = (chave: string, valores: Record<string, string | number> = {}) => {
    const modelo = t[chave];
    if (modelo === undefined) throw new Error(`POP: texto “${chave}” ausente de pop_templates.json.`);
    return preencher(modelo, valores);
  };

  const geral = escopo.tipo === 'geral';
  const setoresFpe = geral ? fpe.setores : fpe.setores.filter((s) => s.setor.id === escopo.setorId);
  if (setoresFpe.length === 0) throw new Error(`POP: setor “${geral ? '' : escopo.setorId}” sem fichas.`);
  const unico = setoresFpe.length === 1 ? setoresFpe[0]!.setor : null;

  const nomeFase = new Map(v08.fases.map((f) => [f.id, f.nome]));
  const acaoPorId = new Map(v08.acoes.map((a) => [a.id, a]));
  const respostasDaSecao = (s: Setor, secao: number): Bloco[] => {
    const itens = perguntas
      .filter((p) => p.setor_id === s.id && p.secao === secao)
      .map((p) => ({ pergunta: p.pergunta, resposta: respostaEmVigor(p, respostas) }))
      .filter((i) => i.resposta !== '');
    return itens.length ? [{ tipo: 'respostas', itens }] : [];
  };
  const estagiosLista = (ids: number[]) => ids.map((id) => `Est. ${pad2(id)}`).join(', ');

  const corpo: Record<string, () => Bloco[]> = {
    objetivo: () => [
      {
        tipo: 'paragrafo',
        texto: unico
          ? texto('objetivo_setorial', { setor: unico.nome, tipo: (unico.tipo_rotulo ?? unico.tipo ?? 'setor').toLowerCase(), n_estagios_setor: setoresFpe[0]!.estagios.length })
          : texto('objetivo_geral', { n_setores: v08.setores.length, n_estagios: v08.estagios.length }),
      },
      ...porSetor(setoresFpe, !unico, (s) => [
        ...(s.setor.funcoes?.length ? ([{ tipo: 'paragrafo', texto: texto('funcoes_titulo') }, { tipo: 'lista', itens: s.setor.funcoes }] as Bloco[]) : []),
        ...respostasDaSecao(s.setor, 1),
      ]),
    ],

    abrangencia: () => [
      { tipo: 'paragrafo', texto: unico ? texto('abrangencia_intro_setorial') : texto('abrangencia_intro_geral', { n_estagios: v08.estagios.length }) },
      ...porSetor(setoresFpe, !unico, (s) => [
        {
          tipo: 'lista',
          itens: s.estagios.map((e) => `Est. ${e.numero} — ${e.estagio.nome} (${nomeFase.get(e.estagio.fase_id) ?? ''}) — ${e.fichas.length} ${e.fichas.length === 1 ? 'ação' : 'ações'}`),
        },
        ...respostasDaSecao(s.setor, 2),
      ]),
    ],

    responsaveis: () =>
      porSetor(setoresFpe, !unico, (s) => {
        const quem = unicos(s.estagios.flatMap((e) => e.fichas.map((f) => f.valores.who.trim())).filter(Boolean));
        const blocos: Bloco[] = [{ tipo: 'paragrafo', texto: texto('responsaveis_quem') }, { tipo: 'lista', itens: quem }];
        if (s.setor.equipes?.length) {
          blocos.push({ tipo: 'paragrafo', texto: texto('responsaveis_equipes') });
          blocos.push({ tipo: 'lista', itens: s.setor.equipes.map((e) => `${e.regiao} — ${e.nome}`) });
        }
        if (s.setor.empresas?.length) {
          blocos.push({ tipo: 'paragrafo', texto: texto('responsaveis_empresas') });
          blocos.push({ tipo: 'lista', itens: s.setor.empresas });
        }
        return [...blocos, ...respostasDaSecao(s.setor, 3)];
      }),

    definicoes: () => {
      const ids = new Set(setoresFpe.map((s) => s.setor.id));
      const corpus = [
        ...setoresFpe.flatMap((s) => s.estagios.flatMap((e) => e.fichas.map((f) => `${f.valores.what} ${f.valores.how}`))),
        ...bibliotecas.documentos.filter((d) => d.setor_ids.some((id) => ids.has(id))).map((d) => d.nome),
        ...bibliotecas.ferramentas.filter((f) => f.setor_ids.some((id) => ids.has(id))).map((f) => f.nome),
      ].join('\n');
      const itens = templates.glossario.filter((g) => g.busca === '' || new RegExp(g.busca).test(corpus)).map((g) => `${g.termo}: ${g.definicao}`);
      return [{ tipo: 'paragrafo', texto: texto('definicoes_intro') }, { tipo: 'lista', itens }];
    },

    pre_requisitos: () =>
      porSetor(setoresFpe, !unico, (s) => {
        const docs = bibliotecas.documentos.filter((d) => d.setor_ids.includes(s.setor.id));
        return [
          docs.length
            ? ({ tipo: 'paragrafo', texto: texto('documentos_intro') } as Bloco)
            : ({ tipo: 'paragrafo', texto: texto('sem_documentos') } as Bloco),
          ...(docs.length ? ([{ tipo: 'lista', itens: docs.map((d) => `${d.nome} (${estagiosLista(d.estagio_ids)})`) }] as Bloco[]) : []),
          ...respostasDaSecao(s.setor, 5),
        ];
      }),

    procedimento: () => {
      const docRespostas = templates.textos.respostas_padrao_documento ?? '';
      const blocos: Bloco[] = [{ tipo: 'paragrafo', texto: texto('procedimento_intro') }];
      for (const s of setoresFpe) {
        if (!unico) blocos.push({ tipo: 'subtitulo', texto: s.setor.nome });
        for (const e of s.estagios) {
          blocos.push({ tipo: 'subtitulo', texto: `Est. ${e.numero} — ${e.estagio.nome}` });
          blocos.push({
            tipo: 'passos',
            passos: e.fichas.map((f, i) => ({
              numero: i + 1,
              texto: f.valores.what,
              ifElse: f.ifElse,
              detalhes: (['how', 'why', 'where', 'when'] as const).filter((c) => f.valores[c].trim() !== '').map((c) => ({ rotulo: CAMPOS[c].rotulo, valor: f.valores[c] })),
            })),
          });
        }
        if (docRespostas && bibliotecas.documentos.some((d) => d.nome === docRespostas && d.setor_ids.includes(s.setor.id))) {
          blocos.push({ tipo: 'subtitulo', texto: texto('respostas_padrao_titulo') });
          blocos.push({ tipo: 'paragrafo', texto: texto('respostas_padrao_nota') });
          for (const r of v08.respostas_padrao) {
            blocos.push({ tipo: 'paragrafo', texto: `${r.tema}: ${r.texto}${r.revisao_juridica ? ` (${texto('sujeita_revisao')})` : ''}` });
          }
        }
        blocos.push(...respostasDaSecao(s.setor, 6));
      }
      return blocos;
    },

    condicionais: () => [
      { tipo: 'paragrafo', texto: texto('condicionais_intro') },
      ...porSetor(setoresFpe, !unico, (s) => {
        const linhas = v08.condicionais
          .filter((c) => acaoPorId.get(c.acao_id)?.setor_id === s.setor.id)
          .map((c) => [`Est. ${pad2(acaoPorId.get(c.acao_id)?.estagio_id ?? 0)}`, c.pergunta, `${c.se_sim.rotulo}: ${c.se_sim.texto}`, `${c.se_nao.rotulo}: ${c.se_nao.texto}`]);
        return [
          linhas.length ? ({ tipo: 'tabela', colunas: ['Estágio', 'Decisão', 'Se sim', 'Se não'], linhas } as Bloco) : ({ tipo: 'paragrafo', texto: texto('sem_condicionais') } as Bloco),
          ...respostasDaSecao(s.setor, 7),
        ];
      }),
    ],

    ferramentas: () => {
      const situacao = (s: string) => texto(`situacao_${s}`);
      return porSetor(setoresFpe, !unico, (s) => {
        const itens = bibliotecas.ferramentas.filter((f) => f.setor_ids.includes(s.setor.id)).map((f) => `${f.nome} — ${situacao(f.situacao)}${f.observacao ? `. ${f.observacao}` : ''}`);
        return [
          itens.length
            ? ({ tipo: 'paragrafo', texto: texto('ferramentas_intro') } as Bloco)
            : ({ tipo: 'paragrafo', texto: texto('sem_ferramentas') } as Bloco),
          ...(itens.length ? ([{ tipo: 'lista', itens }] as Bloco[]) : []),
          ...respostasDaSecao(s.setor, 8),
        ];
      });
    },

    metricas: () => [
      { tipo: 'paragrafo', texto: texto('metricas_intro') },
      ...porSetor(setoresFpe, !unico, (s) => {
        const kpis = bibliotecas.kpis.filter((k) => k.setor_id === s.setor.id);
        const blocos: Bloco[] = [];
        if (kpis.length) {
          blocos.push({
            tipo: 'tabela',
            colunas: ['Indicador', 'Tipo', 'Como calcular', 'Meta'],
            linhas: kpis.map((k) => [k.nome, k.tipo === 'produtividade' ? 'Produtividade' : 'Eficiência', k.formula_descricao, texto('meta_a_definir')]),
          });
          if (kpis.some((k) => k.acompanhamento)) blocos.push({ tipo: 'paragrafo', texto: texto('acompanhamento_nota') });
          blocos.push({ tipo: 'subtitulo', texto: texto('formulario_titulo') });
          const campos = kpis[0]!.formulario;
          blocos.push({ tipo: 'tabela', colunas: campos.map((c) => templates.formulario_campos[c]), linhas: kpis.map((k) => campos.map((c) => (c === 'indicador' ? k.nome : ''))) });
        }
        return [...blocos, ...respostasDaSecao(s.setor, 9)];
      }),
    ],

    registros: () => {
      const re = new RegExp(t.registros_busca ?? '$^', 'i');
      return porSetor(setoresFpe, !unico, (s) => {
        const docs = bibliotecas.documentos.filter((d) => d.setor_ids.includes(s.setor.id) && re.test(d.nome));
        return [
          docs.length ? ({ tipo: 'paragrafo', texto: texto('registros_intro') } as Bloco) : ({ tipo: 'paragrafo', texto: texto('sem_registros') } as Bloco),
          ...(docs.length ? ([{ tipo: 'lista', itens: docs.map((d) => d.nome) }] as Bloco[]) : []),
          ...respostasDaSecao(s.setor, 10),
        ];
      });
    },

    revisao_juridica: () => [
      { tipo: 'paragrafo', texto: texto('juridico_intro') },
      { tipo: 'lista', itens: observacoes.itens.map((o) => `${o.diretriz} ${texto('juridico_revisar')} ${o.revisar}`) },
      { tipo: 'aviso', texto: observacoes.aviso },
    ],
  };

  const secoes: SecaoPop[] = templates.secoes.map((s) => {
    const montar = corpo[s.chave];
    if (!montar) throw new Error(`POP: a seção “${s.chave}” do template não tem gerador.`);
    return { numero: s.numero, chave: s.chave, titulo: s.titulo, blocos: montar() };
  });

  return {
    escopo: geral ? 'geral' : 'setor',
    setorId: unico ? unico.id : null,
    titulo: unico ? texto('titulo_setorial', { setor: unico.nome }) : texto('titulo_geral'),
    subtitulo: unico ? texto('subtitulo_setorial', { setor: unico.nome }) : texto('subtitulo_geral'),
    secoes,
  };
}

/** Todo o texto do POP em uma string (para conferências e busca). */
export function textoDoPop(pop: Pop): string {
  const partes: string[] = [pop.titulo, pop.subtitulo];
  for (const s of pop.secoes) {
    partes.push(`${s.numero}. ${s.titulo}`);
    for (const b of s.blocos) {
      if (b.tipo === 'paragrafo' || b.tipo === 'subtitulo' || b.tipo === 'aviso') partes.push(b.texto);
      else if (b.tipo === 'lista') partes.push(...b.itens);
      else if (b.tipo === 'passos') partes.push(...b.passos.flatMap((p) => [p.texto, ...p.detalhes.map((d) => `${d.rotulo}: ${d.valor}`)]));
      else if (b.tipo === 'tabela') partes.push(b.colunas.join(' | '), ...b.linhas.map((l) => l.join(' | ')));
      else partes.push(...b.itens.flatMap((i) => [i.pergunta, i.resposta]));
    }
  }
  return partes.join('\n');
}
