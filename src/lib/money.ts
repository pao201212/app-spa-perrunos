// Montos en pesos colombianos: enteros, sin decimales (SPEC §8).

/** "$ 55.000", "55,000" o "55000" → 55000. Devuelve null si no es un monto válido. */
export function parseCop(input: string): number | null {
  const cleaned = input.replace(/[$\s]/g, "");
  if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(cleaned)) return null;
  return Number(cleaned.replace(/[.,]/g, ""));
}

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCop(amount: number): string {
  return copFormatter.format(amount);
}
