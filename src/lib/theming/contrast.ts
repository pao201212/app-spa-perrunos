export type Rgb = [number, number, number];

/** Convierte #rgb o #rrggbb a [r, g, b]. Devuelve null para cualquier otro formato. */
export function parseHexColor(value: string): Rgb | null {
  const hex = value.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(hex);
  if (short) return short.slice(1).map((c) => parseInt(c + c, 16)) as Rgb;
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(hex);
  if (long) return long.slice(1).map((c) => parseInt(c, 16)) as Rgb;
  return null;
}

function relativeLuminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Razón de contraste WCAG 2.x entre dos colores hex (1 a 21). */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg)
    throw new Error(`Solo se evalúa contraste entre colores hex: ${foreground}, ${background}`);
  const [light, dark] = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
