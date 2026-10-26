/** Mes "YYYY-MM" de la URL, o el de hoy si falta o es inválido. */
export function parseMonth(value: string | undefined, today: string): string {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : today.slice(0, 7);
}

/** Primer y último día del mes ("2026-11" → ["2026-11-01", "2026-11-30"]). */
export function monthRange(month: string): [string, string] {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(last).padStart(2, "0")}`];
}

/** Mes anterior o siguiente. */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

/** Celdas vacías antes del día 1 en un calendario que empieza el lunes. */
export function leadingBlanks(month: string): number {
  const weekday = new Date(`${month}-01T12:00:00Z`).getUTCDay(); // 0 = domingo
  return (weekday + 6) % 7;
}

export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T12:00:00Z`),
  );
