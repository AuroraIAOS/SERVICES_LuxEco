// Dados do POP (data/conteudo/perguntas_pop.json, pop_templates.json, pop_observacoes_juridicas.json). Carregados só com a tela POP.
import observacoesJson from '../../data/conteudo/pop_observacoes_juridicas.json' with { type: 'json' };
import templatesJson from '../../data/conteudo/pop_templates.json' with { type: 'json' };
import perguntasJson from '../../data/conteudo/perguntas_pop.json' with { type: 'json' };
import type { DocumentoPerguntasPop, ObservacoesJuridicasPop, PopTemplates } from './tipos.ts';

export const PERGUNTAS_POP = perguntasJson as unknown as DocumentoPerguntasPop;
export const POP_TEMPLATES = templatesJson as unknown as PopTemplates;
export const POP_OBSERVACOES = observacoesJson as unknown as ObservacoesJuridicasPop;
