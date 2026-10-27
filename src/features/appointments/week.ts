/** Fecha "YYYY-MM-DD" de la URL, o hoy si falta o es inválida. */
export function parseDay(value: string | undefined, today: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
    ? value
    : today;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Los 7 días (lunes a domingo) de la semana que contiene `date`. */
export function weekOf(date: string): string[] {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = domingo
  const monday = addDays(date, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** "lun 2 nov" */
export function shortDay(date: string): string {
  const parts = new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value.replace(/\./g, "") ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}
