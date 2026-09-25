// SVG de raias próprio (decisão do spike 01.5: o Mermaid estoura a largura em 9 de 16 diagramas).
// Puro (string → string), sem DOM: roda no navegador, no Node e no teste. Cores e fonte vêm só de design/tokens.json.
//  · raiasSetor: UM setor, dividido em bandas por fase; colunas = estágios com ação; cartões empilhados na ordem da planilha.
//  · raiasFase: TODOS os setores de uma fase; linhas (raias) = setores; colunas = estágios da fase.
import tokens from '../../design/tokens.json' with { type: 'json' };
import type { Acao, Condicional, Matriz } from '../dados/tipos.ts';

export type Tema = 'claro' | 'escuro';
export interface Opcoes {
  tema?: Tema;
}

// ---- geometria (px). Largura útil do A3 paisagem = 1512 px; com 9 colunas ≈ 1.9 mil px → escala ≥ 0,75 → fonte ≥ 8 pt.
export const FONTE_PX = 14;
const FONTE = FONTE_PX;
const LINHA = 18;
const PAD = 8;
const COL_W = 186;
const GAP = 14;
const MARGEM = 16;
const CAB_H = 46;
const BANDA_H = 30;
const RAIA_LABEL_W = 140;
const ROTULO_FONTE = 13; // nomes de setor (negrito) — largura calculada p/ caber "Administrativo" sem cortar a palavra
const ROTULO_CHAR = ROTULO_FONTE * 0.64;
const LARGURA_CHAR = FONTE * 0.58; // média conservadora (a fonte da marca é fina; o fallback é mais larga)

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Quebra em linhas de no máximo `max` caracteres (palavras longas são cortadas). */
export function quebrar(texto: string, max: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.replace(/\s+/g, ' ').trim().split(' ')) {
    let p = palavra;
    while (p.length > max) {
      if (atual) {
        linhas.push(atual);
        atual = '';
      }
      linhas.push(p.slice(0, max));
      p = p.slice(max);
    }
    if (!atual) atual = p;
    else if (atual.length + 1 + p.length <= max) atual += ` ${p}`;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [''];
}

interface Paleta {
  fundo: string;
  texto: string;
  cartao: string;
  borda: string;
  destaque: string;
  sim: string;
  nao: string;
  whatsapp: string;
}
const paleta = (tema: Tema): Paleta => {
  const c = tokens.cores;
  return tema === 'escuro'
    ? { fundo: c.chumbo, texto: c.branco, cartao: c['chumbo-mid'], borda: c['chumbo-light'], destaque: c.amarelo, sim: c.sucesso, nao: c.erro, whatsapp: c.whatsapp }
    : { fundo: c.branco, texto: c.chumbo, cartao: c.branco, borda: c['chumbo-lighter'], destaque: c.amarelo, sim: c.sucesso, nao: c.erro, whatsapp: c.whatsapp };
};
const corSetor = (m: Matriz, setorId: string): string => {
  const chave = m.setores.find((s) => s.id === setorId)?.cor_token.replace(/^setor-/, '') ?? '';
  return (tokens.setores as Record<string, string>)[chave] ?? tokens.cores.amarelo;
};

interface Cartao {
  altura: number;
  desenhar: (x: number, y: number, cor: string) => string;
}

/** Cartão de uma ação. IF/ELSE mostra os dois ramos (✓ / ✗) dentro do cartão, com um losango no canto. */
function cartaoAcao(a: Acao, c: Condicional | undefined, p: Paleta, prefixo = ''): Cartao {
  const max = Math.floor((COL_W - 2 * PAD - 4) / LARGURA_CHAR);
  const principal = quebrar(`${prefixo}${a.texto}`, max);
  const ramoSim = c ? quebrar(`✓ ${c.se_sim.rotulo}: ${c.se_sim.texto}`, max) : [];
  const ramoNao = c ? quebrar(`✗ ${c.se_nao.rotulo}: ${c.se_nao.texto}`, max) : [];
  const wa = a.canal === 'whatsapp_grupo_fluxo' ? 1 : 0;
  const linhas = principal.length + ramoSim.length + ramoNao.length + wa;
  const altura = 2 * PAD + linhas * LINHA + (c ? 6 : 0);
  return {
    altura,
    desenhar: (x, y, cor) => {
      let ty = y + PAD + FONTE;
      const partes: string[] = [
        `<rect x="${x}" y="${y}" width="${COL_W}" height="${altura}" rx="6" fill="${p.cartao}" stroke="${p.borda}"/>`,
        `<rect x="${x}" y="${y}" width="4" height="${altura}" rx="2" fill="${cor}"/>`,
      ];
      const texto = (ls: string[], fill: string) => {
        for (const l of ls) {
          partes.push(`<text x="${x + PAD + 4}" y="${ty}" fill="${fill}">${esc(l)}</text>`);
          ty += LINHA;
        }
      };
      texto(principal, p.texto);
      if (c) {
        ty += 6;
        texto(ramoSim, p.sim);
        texto(ramoNao, p.nao);
        const cx = x + COL_W - 12;
        partes.push(`<polygon points="${cx},${y + 5} ${cx + 7},${y + 12} ${cx},${y + 19} ${cx - 7},${y + 12}" fill="${p.destaque}"><title>IF/ELSE</title></polygon>`);
      }
      if (wa) texto(['● Grupo de Fluxo WhatsApp'], p.whatsapp);
      return partes.join('');
    },
  };
}

const seta = (x1: number, y: number, x2: number, cor: string) =>
  `<path d="M${x1} ${y}H${x2 - 5}" stroke="${cor}" stroke-width="1.5" fill="none"/><path d="M${x2 - 6} ${y - 4}L${x2} ${y}L${x2 - 6} ${y + 4}Z" fill="${cor}"/>`;
const setaBaixo = (x: number, y1: number, y2: number, cor: string) =>
  `<path d="M${x} ${y1}V${y2 - 4}" stroke="${cor}" stroke-width="1.5" fill="none"/><path d="M${x - 4} ${y2 - 6}L${x} ${y2}L${x + 4} ${y2 - 6}Z" fill="${cor}"/>`;

function cabecalhoEstagio(x: number, y: number, num: number, nome: string, p: Paleta): string {
  const linhas = quebrar(nome, Math.floor((COL_W - 2 * PAD) / LARGURA_CHAR)).slice(0, 2);
  return (
    `<rect x="${x}" y="${y}" width="${COL_W}" height="${CAB_H}" rx="6" fill="${p.destaque}" fill-opacity="0.18" stroke="${p.destaque}"/>` +
    `<text x="${x + PAD}" y="${y + 18}" font-weight="800" fill="${p.texto}">${String(num).padStart(2, '0')}</text>` +
    linhas.map((l, i) => `<text x="${x + PAD + 26}" y="${y + 18 + i * LINHA}" fill="${p.texto}">${esc(l)}</text>`).join('')
  );
}

function envelope(largura: number, altura: number, titulo: string, p: Paleta, corpo: string): string {
  const fam = `'${tokens.tipografia.familia}', ${tokens.tipografia.fallback}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(titulo)}" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" ` +
    `font-family="${esc(fam)}" font-size="${FONTE}" font-weight="${tokens.tipografia['peso-corpo']}">` +
    `<title>${esc(titulo)}</title><rect width="${largura}" height="${altura}" fill="${p.fundo}"/>${corpo}</svg>`
  );
}

const porOrdem = (a: Acao, b: Acao) => a.estagio_id - b.estagio_id || a.ordem - b.ordem;

/** Fluxo de UM setor: uma banda por fase; cada coluna é um estágio com ação. */
export function raiasSetor(m: Matriz, setorId: string, op: Opcoes = {}): string {
  const p = paleta(op.tema ?? 'claro');
  const setor = m.setores.find((s) => s.id === setorId);
  if (!setor) throw new Error(`Setor "${setorId}" inexistente`);
  const cor = corSetor(m, setorId);
  const condicionais = new Map(m.condicionais.map((c) => [c.acao_id, c]));
  const acoes = m.acoes.filter((a) => a.setor_id === setorId).sort(porOrdem);
  const bandas = m.fases
    .map((f) => ({
      fase: f,
      colunas: m.estagios
        .filter((e) => e.fase_id === f.id && acoes.some((a) => a.estagio_id === e.id))
        .map((e) => ({ estagio: e, cartoes: acoes.filter((a) => a.estagio_id === e.id).map((a) => cartaoAcao(a, condicionais.get(a.id), p)) })),
    }))
    .filter((b) => b.colunas.length > 0);

  const maxCols = Math.max(1, ...bandas.map((b) => b.colunas.length));
  const largura = 2 * MARGEM + maxCols * (COL_W + GAP) - GAP;
  let y = MARGEM;
  const corpo: string[] = [`<text x="${MARGEM}" y="${y + 16}" font-weight="800" font-size="${FONTE + 4}" fill="${p.texto}">${esc(setor.nome)}</text>`];
  y += 32;
  for (const b of bandas) {
    // amarelo sobre branco não passa no contraste AA: texto na cor do tema + filete amarelo
    corpo.push(`<rect x="${MARGEM}" y="${y + 22}" width="48" height="3" fill="${p.destaque}"/>`);
    corpo.push(`<text x="${MARGEM}" y="${y + 16}" font-weight="800" fill="${p.texto}">Fase ${b.fase.id} — ${esc(b.fase.nome)}</text>`);
    y += BANDA_H;
    let alturaBanda = 0;
    b.colunas.forEach((col, i) => {
      const x = MARGEM + i * (COL_W + GAP);
      corpo.push(cabecalhoEstagio(x, y, col.estagio.numero, col.estagio.nome, p));
      if (i > 0) corpo.push(seta(x - GAP, y + CAB_H / 2, x, p.borda));
      let cy = y + CAB_H + 10;
      col.cartoes.forEach((c, k) => {
        if (k > 0) corpo.push(setaBaixo(x + COL_W / 2, cy - 10, cy, p.borda));
        corpo.push(c.desenhar(x, cy, cor));
        cy += c.altura + 10;
      });
      alturaBanda = Math.max(alturaBanda, cy - y);
    });
    y += alturaBanda + 14;
  }
  return envelope(largura, y + MARGEM - 14, `Fluxo do setor ${setor.nome}`, p, corpo.join(''));
}

/** Fluxo GERAL de uma fase: raias = setores presentes; colunas = estágios da fase. */
export function raiasFase(m: Matriz, faseId: number, op: Opcoes = {}): string {
  const p = paleta(op.tema ?? 'claro');
  const fase = m.fases.find((f) => f.id === faseId);
  if (!fase) throw new Error(`Fase ${faseId} inexistente`);
  const condicionais = new Map(m.condicionais.map((c) => [c.acao_id, c]));
  const estagios = m.estagios.filter((e) => e.fase_id === faseId);
  const ids = new Set(estagios.map((e) => e.id));
  const setores = m.setores.filter((s) => m.acoes.some((a) => a.setor_id === s.id && ids.has(a.estagio_id)));

  const largura = 2 * MARGEM + RAIA_LABEL_W + estagios.length * (COL_W + GAP) - GAP + GAP;
  const corpo: string[] = [`<text x="${MARGEM}" y="${MARGEM + 16}" font-weight="800" font-size="${FONTE + 4}" fill="${p.texto}">Fase ${fase.id} — ${esc(fase.nome)}</text>`];
  let y = MARGEM + 32;
  const x0 = MARGEM + RAIA_LABEL_W + GAP;
  estagios.forEach((e, i) => {
    const x = x0 + i * (COL_W + GAP);
    corpo.push(cabecalhoEstagio(x, y, e.numero, e.nome, p));
    if (i > 0) corpo.push(seta(x - GAP, y + CAB_H / 2, x, p.borda));
  });
  y += CAB_H + 12;
  for (const s of setores) {
    const cor = corSetor(m, s.id);
    const celulas = estagios.map((e) =>
      m.acoes.filter((a) => a.setor_id === s.id && a.estagio_id === e.id).sort(porOrdem).map((a) => cartaoAcao(a, condicionais.get(a.id), p)),
    );
    const alturaRaia = Math.max(40, ...celulas.map((cs) => cs.reduce((t, c) => t + c.altura + 10, 0)));
    corpo.push(`<rect x="${MARGEM}" y="${y}" width="${largura - 2 * MARGEM}" height="${alturaRaia}" rx="6" fill="${cor}" fill-opacity="0.06" stroke="${p.borda}"/>`);
    corpo.push(`<rect x="${MARGEM}" y="${y}" width="5" height="${alturaRaia}" rx="2" fill="${cor}"/>`);
    quebrar(s.nome, Math.floor((RAIA_LABEL_W - 2 * PAD - 4) / ROTULO_CHAR)).forEach((l, i) =>
      corpo.push(`<text x="${MARGEM + PAD + 4}" y="${y + 22 + i * LINHA}" font-size="${ROTULO_FONTE}" font-weight="800" fill="${cor === tokens.cores.amarelo && (op.tema ?? 'claro') === 'claro' ? p.texto : cor}">${esc(l)}</text>`),
    );
    celulas.forEach((cs, i) => {
      const x = x0 + i * (COL_W + GAP);
      let cy = y + 5;
      cs.forEach((c, k) => {
        if (k > 0) corpo.push(setaBaixo(x + COL_W / 2, cy - 10, cy, p.borda));
        corpo.push(c.desenhar(x, cy, cor));
        cy += c.altura + 10;
      });
    });
    y += alturaRaia + 10;
  }
  return envelope(largura, y + MARGEM, `Fluxo geral — Fase ${fase.id}: ${fase.nome}`, p, corpo.join(''));
}
