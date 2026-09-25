// Contraste WCAG 2.1 e ajuste de cor de texto. Puro. Nenhuma cor nova nasce aqui: cada tom é uma mistura de cores dos tokens.

type Rgb = [number, number, number];

const paraRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
};
const paraHex = ([r, g, b]: Rgb): string => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

const linear = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminancia = ([r, g, b]: Rgb) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/** Razão de contraste WCAG entre duas cores `#RRGGBB` (1 a 21). */
export function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(paraRgb(a)), luminancia(paraRgb(b))].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (escuro + 0.05);
}

/** `t` de `a` sobre `b`: 0 = só `b`, 1 = só `a`. Serve também para a cor de uma faixa translúcida sobre o fundo. */
export function misturar(a: string, b: string, t: number): string {
  const [ra, rb] = [paraRgb(a), paraRgb(b)];
  return paraHex(ra.map((v, i) => v * t + (rb[i] as number) * (1 - t)) as Rgb);
}

/**
 * A própria cor se já passa no contraste mínimo sobre o fundo; senão, a cor puxada aos poucos para o `polo`
 * (branco no tema escuro, chumbo no claro) até passar. Mantém o matiz reconhecível (verde continua verde).
 */
export function corLegivel(cor: string, fundo: string, polo: string, minimo = 4.5): string {
  if (contraste(cor, fundo) >= minimo) return cor;
  for (let passo = 1; passo <= 20; passo++) {
    const candidata = misturar(polo, cor, passo / 20);
    if (contraste(candidata, fundo) >= minimo) return candidata;
  }
  return polo;
}
