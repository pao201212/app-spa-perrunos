/** Días de la semana en el orden de la BD (0 = domingo). */
export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** Orden de presentación: la semana laboral empieza el lunes. */
export const WEEKDAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

/** "08:00:00" → "08:00" */
export const shortTime = (time: string) => time.slice(0, 5);

/** "2026-12-25" → "viernes, 25 de diciembre de 2026" (sin desfases de zona horaria). */
export function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
