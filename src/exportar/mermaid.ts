// Export .mermaid: o texto do Mermaid gerado pela Matriz COM as edições do FPE, com um cabeçalho de comentários (%%).
// O Mermaid só serve de arquivo de troca (o fluxograma da tela e do PDF é o SVG de raias — decisão do spike 01.5).
import type { Matriz } from '../dados/tipos';
import { mermaidFase, mermaidSetor } from '../fluxograma/mermaid';
import { NOME_APP, NOTA_PROPRIEDADE } from '../ui/identidade';
import { dataLocal } from './baixar';

/** Comentário de uma linha: sem quebra e sem chaves (`%%{` abriria uma diretiva). */
const comentario = (t: string) => `%% ${t.replace(/[\r\n]+/g, ' ').replace(/[{}]/g, '')}`;
const cabecalho = (titulo: string, agora: Date) => [comentario(titulo), comentario(`${NOME_APP} · exportado em ${dataLocal(agora)}`), comentario(NOTA_PROPRIEDADE)].join('\n');

export function exportarMermaidSetor(matriz: Matriz, setorId: string, agora: Date): string {
  const setor = matriz.setores.find((s) => s.id === setorId);
  if (!setor) throw new Error(`Setor "${setorId}" inexistente`);
  return `${cabecalho(`Fluxo do setor ${setor.nome}`, agora)}\n${mermaidSetor(matriz, setorId)}\n`;
}

export function exportarMermaidFase(matriz: Matriz, faseId: number, agora: Date): string {
  const fase = matriz.fases.find((f) => f.id === faseId);
  if (!fase) throw new Error(`Fase ${faseId} inexistente`);
  return `${cabecalho(`Fluxo geral — Fase ${fase.id}: ${fase.nome}`, agora)}\n${mermaidFase(matriz, faseId)}\n`;
}
