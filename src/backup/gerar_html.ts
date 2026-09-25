// Gera o backup `.html` (03.6): documento AUTOSSUFICIENTE e legível sem o app (estático, sem JavaScript, sem rede), com o estado em
// JSON no bloco `lux-estado`, que permite restaurar. Cores só dos tokens da marca (fundo branco, texto chumbo, amarelo em filetes);
// a fonte da marca entra como primeira da lista, com fallback (as fontes não são embutidas: o arquivo ficaria com centenas de kB a mais).
// Sem PII e sem dados de lead: só o texto das fichas, do POP e as edições. A API rejeita o arquivo se houver chave ou senha.
import tokens from '../../design/tokens.json' with { type: 'json' };
import type { Bibliotecas, MatrizV08, ObservacoesJuridicasPop, PerguntaPop, PopTemplates } from '../dados/tipos';
import type { EstadoFpe } from '../estado/armazenamento';
import type { EstadoPop } from '../estado/pop';
import { respostasDoEstado } from '../estado/pop';
import { montarDocumentoFichas } from '../exportar/documento';
import { corpoFichas, escaparHtml } from '../exportar/pdf';
import { htmlBloco } from '../exportar/pop_pdf';
import { gerarPop } from '../pop/gerar';
import type { Fpe } from '../telas/fpe/modelo';
import { NOME_APP, NOME_MARCA, NOTA_PROPRIEDADE } from '../ui/identidade';
import type { EscopoBackup } from './estado';
import { ABERTURA_BLOCO_ESTADO, jsonSeguroParaHtml, montarEstadoBackup, ROTULO_ESCOPO } from './estado';

/** Limite da API (public/api/backups.php): acima disso o envio é recusado (413). */
export const TAMANHO_MAXIMO_BACKUP = 5 * 1024 * 1024;

export interface EntradaBackupHtml {
  escopo: EscopoBackup;
  rotulo: string;
  versaoApp: string;
  agora: Date;
  fpeEstado: EstadoFpe;
  popEstado: EstadoPop;
  /** as fichas com as edições em vigor (`montarFpe`). */
  fpe: Fpe;
  v08: MatrizV08;
  bibliotecas: Bibliotecas;
  perguntas: PerguntaPop[];
  templates: PopTemplates;
  observacoes: ObservacoesJuridicasPop;
}

const cores = tokens.cores;
const familia = `"${tokens.tipografia.familia}", ${tokens.tipografia.fallback}`;

const CSS = `
*{box-sizing:border-box}
body{margin:0;padding:24px 32px;background:${cores.branco};color:${cores.chumbo};font-family:${familia};font-weight:${tokens.tipografia['peso-corpo']};font-size:15px;line-height:1.5}
h1,h2,h3,h4,dt,.marca{font-weight:${tokens.tipografia['peso-titulo']};color:${cores.chumbo}}
.topo{margin:0 0 24px;padding-bottom:12px;border-bottom:5px solid ${cores.amarelo}}
.marca{margin:0 0 4px;font-size:13px;letter-spacing:.04em}
h1{margin:0;font-size:28px;line-height:1.15}
.meta{margin:6px 0 0;font-size:13px}
h2{margin:32px 0 8px;padding-bottom:4px;border-bottom:3px solid ${cores.amarelo};font-size:21px}
h3{margin:20px 0 8px;font-size:17px}
h4{margin:0 0 4px;font-size:15px}
dl{display:grid;grid-template-columns:110px 1fr;gap:3px 12px;margin:0}
dt,dd{margin:0}
.impressao__ficha,.impressao__passo{margin:0 0 14px;padding-left:12px;border-left:4px solid ${cores.amarelo}}
.impressao__passo dl{padding-left:12px}
.impressao__lista{margin:0 0 12px;padding-left:22px}
.impressao__tabela{width:100%;margin:0 0 16px;border-collapse:collapse;font-size:13px}
.impressao__tabela th,.impressao__tabela td{padding:5px 8px;border:1px solid ${cores['chumbo-lighter']};text-align:left;vertical-align:top}
.impressao__tabela th{border-bottom:3px solid ${cores.amarelo}}
.impressao__respostas{margin:12px 0;padding-left:12px;border-left:3px solid ${cores['chumbo-lighter']}}
.impressao__pergunta{margin:8px 0 2px;font-weight:${tokens.tipografia['peso-titulo']}}
.impressao__aviso{font-style:italic}
.rodape{margin-top:32px;padding-top:8px;border-top:1px solid ${cores.chumbo};font-size:12px}
@media print{body{padding:0}.impressao__ficha,.impressao__passo{break-inside:avoid}h2,h3,h4{break-after:avoid}}
`.replace(/\n/g, '');

const dataBR = (d: Date) => d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function gerarHtmlBackup(e: EntradaBackupHtml): string {
  const estado = montarEstadoBackup(e.escopo, e.fpeEstado, e.popEstado, e.agora);
  const partes: string[] = [];

  if (e.escopo !== 'pop') {
    partes.push(`<section aria-label="FPE"><h2>FPE — fichas 5W1H</h2>${corpoFichas(montarDocumentoFichas(e.fpe, e.v08))}</section>`);
  }
  if (e.escopo !== 'fpe') {
    const pop = gerarPop({ tipo: 'geral' }, { v08: e.v08, fpe: e.fpe, bibliotecas: e.bibliotecas, perguntas: e.perguntas, templates: e.templates, observacoes: e.observacoes, respostas: respostasDoEstado(e.popEstado) });
    partes.push(`<section aria-label="POP"><h2>${escaparHtml(pop.titulo)}</h2>${pop.secoes.map((s) => `<section><h3>${s.numero}. ${escaparHtml(s.titulo)}</h3>${s.blocos.map(htmlBloco).join('')}</section>`).join('')}</section>`);
  }

  const rotulo = e.rotulo.trim();
  const titulo = `Versão salva${rotulo ? ` — ${rotulo}` : ''}`;
  return (
    `<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escaparHtml(`${titulo} · ${NOME_APP}`)}</title><style>${CSS}</style></head><body>` +
    `<header class="topo"><p class="marca">${escaparHtml(NOME_MARCA)}</p><h1>${escaparHtml(titulo)}</h1>` +
    `<p class="meta">${escaparHtml(NOME_APP)} · ${escaparHtml(ROTULO_ESCOPO[e.escopo])} · salva em ${escaparHtml(dataBR(e.agora))} · versão ${escaparHtml(e.versaoApp)}</p></header>` +
    `<main>${partes.join('')}</main>` +
    `<footer class="rodape"><p>${escaparHtml(NOTA_PROPRIEDADE)}</p></footer>` +
    `${ABERTURA_BLOCO_ESTADO}${jsonSeguroParaHtml(estado)}</script>` +
    `</body></html>\n`
  );
}

export const tamanhoEmBytes = (html: string) => new TextEncoder().encode(html).length;
