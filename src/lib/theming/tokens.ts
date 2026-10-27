export type ThemeTokens = Record<string, string>;

/** Extrae las custom properties (`--token: valor;`) declaradas en un theme.css. */
export function parseThemeTokens(css: string): ThemeTokens {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const tokens: ThemeTokens = {};
  for (const match of withoutComments.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

/** Valor final de un token, siguiendo referencias `var(--otro)` dentro del mismo tema. */
export function resolveToken(tokens: ThemeTokens, name: string, seen = new Set<string>()): string {
  const value = tokens[name];
  if (value === undefined) throw new Error(`El tema no define ${name}`);
  if (seen.has(name)) throw new Error(`Referencia circular en ${name}`);
  const reference = /^var\((--[a-z0-9-]+)\)$/i.exec(value);
  return reference ? resolveToken(tokens, reference[1], seen.add(name)) : value;
}
