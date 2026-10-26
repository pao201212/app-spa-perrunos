import { z } from "zod";

const checkbox = z.preprocess((value) => value === "on" || value === true, z.boolean());
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(200).nullable().optional().default(null),
);
const intField = (min: number, max: number, message: string) =>
  z.coerce.number(message).int(message).min(min, message).max(max, message);

export const locationDetailsSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del local").max(80, "Máximo 80 caracteres"),
  address: optionalText,
  whatsapp: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{7,20}$/, "Escribe un número de WhatsApp válido, p. ej. +57 300 123 4567")
      .nullable()
      .optional()
      .default(null),
  ),
  is_active: checkbox,
});

export const SLOT_STEPS = [5, 10, 15, 20, 30, 60] as const;

export const bookingSettingsSchema = z.object({
  confirmation_mode: z.enum(["auto", "manual"], "Elige cómo se confirman las reservas"),
  cancel_window_hours: intField(0, 168, "Entre 0 y 168 horas"),
  max_days_ahead: intField(1, 365, "Entre 1 y 365 días"),
  slot_step_min: z.coerce
    .number()
    .refine(
      (value) => (SLOT_STEPS as readonly number[]).includes(value),
      "Elige un intervalo de la lista",
    ),
  bather_continues_drying: checkbox,
});

/** Tina (baño) o mesa (secado y detalles; puede servir también para corte especial). D27. */
export const STATION_KINDS = ["tub", "table"] as const;
export type StationKind = (typeof STATION_KINDS)[number];
export const stationKindLabel: Record<StationKind, string> = { tub: "Tina", table: "Mesa" };

export const stationSchema = z
  .object({
    // Vacío: el servidor propone "Tina N" o "Mesa N".
    name: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.string().trim().max(40, "Máximo 40 caracteres").nullable().optional().default(null),
    ),
    kind: z.enum(STATION_KINDS, "Elige si es tina o mesa"),
    for_special_cut: checkbox,
  })
  .transform((station) => ({
    ...station,
    // La tina solo sirve para bañar.
    for_special_cut: station.kind === "table" && station.for_special_cut,
  }));

/** Primer "Tina N" / "Mesa N" que no esté usado en el local. */
export function nextStationName(kind: StationKind, takenNames: string[]): string {
  const taken = new Set(takenNames.map((name) => name.trim().toLowerCase()));
  for (let n = 1; ; n++) {
    const name = `${stationKindLabel[kind]} ${n}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:MM");

export const hourRangeSchema = z
  .object({
    weekday: intField(0, 6, "Elige un día"),
    opens_at: time,
    closes_at: time,
  })
  .refine((range) => range.closes_at > range.opens_at, {
    path: ["closes_at"],
    message: "La hora de cierre debe ser posterior a la de apertura",
  });

export const closureSchema = z.object({
  date: z.iso.date("Elige una fecha"),
  reason: optionalText,
});

export const APPLY_SECTIONS = ["booking", "stations", "hours", "closures"] as const;

export const applySectionsSchema = z.object({
  sections: z.array(z.enum(APPLY_SECTIONS)).min(1, "Elige al menos una sección para aplicar"),
});
