// Nome do arquivo e download no navegador. Os formatos (json, md, mermaid, pdf) só produzem texto; este módulo o entrega.

/** AAAA-MM-DD no fuso do computador da pessoa (o dia que ela vê no calendário). */
export function dataLocal(d: Date): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** “Equipe Técnica” → “equipe-tecnica”: minúsculas, sem acento, só letras, números e hífen. */
export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * `fpe_<setor|geral>_<AAAA-MM-DD>.<ext>`. O escopo do fluxo geral de uma fase é `geral-fase<N>`
 * (um fluxo por fase; “geral” sozinho é o conjunto de todos os setores).
 */
export function nomeArquivo(escopo: string, extensao: string, agora: Date): string {
  return `fpe_${slug(escopo)}_${dataLocal(agora)}.${extensao}`;
}

/** Baixa `conteudo` como arquivo. UTF-8 sem BOM. */
export function baixar(nome: string, conteudo: string, mime: string): void {
  baixarBlob(nome, new Blob([conteudo], { type: `${mime};charset=utf-8` }));
}

function baixarBlob(nome: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // o navegador já começou o download; soltar a URL logo depois evita vazar memória
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `pop_<setor|geral>_<AAAA-MM-DD>.<ext>` (03.2). */
export function nomeArquivoPop(escopo: string, extensao: string, agora: Date): string {
  return `pop_${slug(escopo)}_${dataLocal(agora)}.${extensao}`;
}

/** `lux_fpe-pop_<AAAA-MM-DD>.xlsx`: uma pasta com as fichas do FPE, as bibliotecas e o POP geral (03.4). */
export function nomeArquivoXlsx(agora: Date): string {
  return `lux_fpe-pop_${dataLocal(agora)}.xlsx`;
}

/** Baixa bytes já prontos (ex.: .docx). */
export function baixarBytes(nome: string, bytes: Uint8Array, mime: string): void {
  baixarBlob(nome, new Blob([bytes as BlobPart], { type: mime }));
}

export const MIME = {
  json: 'application/json',
  md: 'text/markdown',
  mermaid: 'text/vnd.mermaid',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;
