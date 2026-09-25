// Gera código Mermaid (flowchart LR) a partir da Matriz. Puro: sem DOM, testável em Node.
import type { Acao, Condicional, Estagio, Matriz } from '../dados/tipos.ts';

const pad2 = (n: number) => String(n).padStart(2, '0');
/** Texto seguro dentro de aspas do Mermaid (o resto é escapado pelo securityLevel "strict"). */
export const rotulo = (t: string) => t.replace(/"/g, '#quot;').replace(/\s*\n\s*/g, ' ');
const idNo = (acaoId: string) => acaoId.replace(/[^A-Za-z0-9_]/g, '_');

function ordenar(acoes: Acao[]): Acao[] {
  return [...acoes].sort((a, b) => a.estagio_id - b.estagio_id || a.ordem - b.ordem);
}

function estagioPorId(m: Matriz): Map<number, Estagio> {
  return new Map(m.estagios.map((e) => [e.id, e]));
}

/** Uma ação vira retângulo; ação IF/ELSE vira losango com 2 ramos (Sim/Não) que terminam em folhas. */
function linhasAcao(a: Acao, condicionais: Map<string, Condicional>, prefixo = ''): { no: string; linhas: string[] } {
  const no = idNo(a.id);
  const c = condicionais.get(a.id);
  if (!c) return { no, linhas: [`    ${no}["${prefixo}${rotulo(a.texto)}"]`] };
  return {
    no,
    linhas: [
      `    ${no}{"${prefixo}${rotulo(a.texto)}?"}`,
      `    ${no}_s(["${rotulo(c.se_sim.texto)}"])`,
      `    ${no}_n(["${rotulo(c.se_nao.texto)}"])`,
    ],
  };
}

function ramos(a: Acao, c: Condicional): string[] {
  const no = idNo(a.id);
  return [`  ${no} -->|"Sim: ${rotulo(c.se_sim.rotulo)}"| ${no}_s`, `  ${no} -->|"Não: ${rotulo(c.se_nao.rotulo)}"| ${no}_n`];
}

/** Fluxo de UM setor: estágios como subgrafos, ações encadeadas na ordem da planilha. */
export function mermaidSetor(m: Matriz, setorId: string): string {
  const condicionais = new Map(m.condicionais.map((c) => [c.acao_id, c]));
  const estagios = estagioPorId(m);
  const acoes = ordenar(m.acoes.filter((a) => a.setor_id === setorId));
  const saida = ['flowchart LR'];
  const porEstagio = new Map<number, Acao[]>();
  for (const a of acoes) porEstagio.set(a.estagio_id, [...(porEstagio.get(a.estagio_id) ?? []), a]);
  for (const [id, lista] of porEstagio) {
    const e = estagios.get(id);
    saida.push(`  subgraph E${pad2(id)}["Est. ${pad2(id)} — ${rotulo(e?.nome ?? '')}"]`);
    for (const a of lista) saida.push(...linhasAcao(a, condicionais).linhas);
    saida.push('  end');
  }
  acoes.forEach((a, i) => {
    const prox = acoes[i + 1];
    if (prox) saida.push(`  ${idNo(a.id)} --> ${idNo(prox.id)}`);
    const c = condicionais.get(a.id);
    if (c) saida.push(...ramos(a, c));
  });
  return saida.join('\n');
}

/** Fluxo GERAL de uma fase: um "portão" por estágio encadeado; as ações de todos os setores saem do portão. */
export function mermaidFase(m: Matriz, faseId: number): string {
  const condicionais = new Map(m.condicionais.map((c) => [c.acao_id, c]));
  const setores = new Map(m.setores.map((s) => [s.id, s.nome]));
  const estagios = m.estagios.filter((e) => e.fase_id === faseId);
  const saida = ['flowchart LR'];
  estagios.forEach((e, i) => {
    saida.push(`  G${pad2(e.id)}(["Est. ${pad2(e.id)} — ${rotulo(e.nome)}"])`);
    const prox = estagios[i + 1];
    if (prox) saida.push(`  G${pad2(e.id)} --> G${pad2(prox.id)}`);
  });
  for (const e of estagios) {
    const acoes = ordenar(m.acoes.filter((a) => a.estagio_id === e.id));
    saida.push(`  subgraph S${pad2(e.id)}[" "]`);
    for (const a of acoes) saida.push(...linhasAcao(a, condicionais, `${rotulo(setores.get(a.setor_id) ?? '')}: `).linhas);
    saida.push('  end');
    for (const a of acoes) {
      saida.push(`  G${pad2(e.id)} --> ${idNo(a.id)}`);
      const c = condicionais.get(a.id);
      if (c) saida.push(...ramos(a, c));
    }
  }
  return saida.join('\n');
}
