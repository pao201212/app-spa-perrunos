import { shortTime, WEEKDAY_LABELS, WEEKDAYS_MONDAY_FIRST } from "@/lib/dates";

type HourRange = { weekday: number; opens_at: string; closes_at: string };

/**
 * Resume el horario semanal agrupando días consecutivos (desde el lunes) con el mismo horario:
 * [{ days: "Lunes a viernes", hours: "08:00–12:30 · 13:00–18:00" }, …]
 */
export function summarizeHours(ranges: HourRange[]): { days: string; hours: string }[] {
  const hoursOf = (weekday: number) => {
    const day = ranges
      .filter((r) => r.weekday === weekday)
      .sort((a, b) => a.opens_at.localeCompare(b.opens_at))
      .map((r) => `${shortTime(r.opens_at)}–${shortTime(r.closes_at)}`);
    return day.length > 0 ? day.join(" · ") : "Cerrado";
  };

  const groups: { from: number; to: number; hours: string }[] = [];
  for (const weekday of WEEKDAYS_MONDAY_FIRST) {
    const hours = hoursOf(weekday);
    const last = groups.at(-1);
    if (last && last.hours === hours) last.to = weekday;
    else groups.push({ from: weekday, to: weekday, hours });
  }

  return groups.map(({ from, to, hours }) => {
    const span =
      WEEKDAYS_MONDAY_FIRST.indexOf(to as never) - WEEKDAYS_MONDAY_FIRST.indexOf(from as never);
    const first = WEEKDAY_LABELS[from];
    const lastDay = WEEKDAY_LABELS[to].toLowerCase();
    const days =
      span === 0 ? first : span === 1 ? `${first} y ${lastDay}` : `${first} a ${lastDay}`;
    return { days, hours };
  });
}

/** Enlace de WhatsApp (wa.me) a partir del número del local. */
export function whatsappLink(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}
