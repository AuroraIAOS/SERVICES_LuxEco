// As bibliotecas (data/conteudo/{documentos,ferramentas,investimentos,kpis}.json). Arquivo separado para o POP e o XLSX carregarem sob demanda.
import documentosJson from '../../data/conteudo/documentos.json' with { type: 'json' };
import ferramentasJson from '../../data/conteudo/ferramentas.json' with { type: 'json' };
import investimentosJson from '../../data/conteudo/investimentos.json' with { type: 'json' };
import kpisJson from '../../data/conteudo/kpis.json' with { type: 'json' };
import type { Bibliotecas, Documento, Ferramenta, Investimento, Kpi } from './tipos.ts';

export const BIBLIOTECAS: Bibliotecas = {
  documentos: (documentosJson as unknown as { documentos: Documento[] }).documentos,
  ferramentas: (ferramentasJson as unknown as { ferramentas: Ferramenta[] }).ferramentas,
  investimentos: (investimentosJson as unknown as { investimentos: Investimento[] }).investimentos,
  kpis: (kpisJson as unknown as { kpis: Kpi[] }).kpis,
};
