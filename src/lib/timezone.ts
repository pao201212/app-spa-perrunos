import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Las fechas se guardan en UTC (timestamptz) y se muestran y editan en la zona horaria del spa.

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "2026-12-24T08:00" (input datetime-local, hora del spa) → ISO en UTC. */
export function zonedInputToUtc(value: string, timeZone: string): string {
  const match = LOCAL_INPUT.exec(value);
  if (!match) throw new Error(`Fecha y hora inválidas: ${value}`);
  const [, year, month, day, hour, minute] = match.map(Number);
  const zoned = new TZDate(year, month - 1, day, hour, minute, timeZone);
  return new Date(zoned.getTime()).toISOString();
}

/** ISO en UTC → valor para un input datetime-local en la hora del spa. */
export function utcToZonedInput(iso: string, timeZone: string): string {
  return format(new TZDate(iso, timeZone), "yyyy-MM-dd'T'HH:mm");
}

/** ISO en UTC → "jue 24 dic 2026, 08:00" en la hora del spa. */
export function formatInZone(iso: string, timeZone: string): string {
  return format(new TZDate(iso, timeZone), "EEE d MMM yyyy, HH:mm", { locale: es }).replace(
    /\./g,
    "",
  );
}
