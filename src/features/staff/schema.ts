import { z } from "zod";

export const STAFF_SKILLS = ["bath", "dry", "finish", "special_cut"] as const;
export type StaffSkill = (typeof STAFF_SKILLS)[number];

export const skillLabel: Record<StaffSkill, string> = {
  bath: "Baña",
  dry: "Seca",
  finish: "Terminado",
  special_cut: "Corte especial",
};

const checkbox = z.preprocess((value) => value === "on" || value === true, z.boolean());
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:MM");
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Elige fecha y hora");

export const staffSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre").max(80, "Máximo 80 caracteres"),
  skills: z.array(z.enum(STAFF_SKILLS)).min(1, "Elige al menos una habilidad"),
  is_active: checkbox,
});

export const shiftSchema = z
  .object({
    location_id: z.uuid("Elige un local"),
    weekday: z.coerce.number().int().min(0).max(6),
    starts_at: time,
    ends_at: time,
  })
  .refine((shift) => shift.ends_at > shift.starts_at, {
    path: ["ends_at"],
    message: "El fin del turno debe ser posterior al inicio",
  });

export const absenceSchema = z
  .object({
    starts_at: localDateTime,
    ends_at: localDateTime,
    reason: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.string().trim().max(200).nullable().optional().default(null),
    ),
  })
  .refine((absence) => absence.ends_at > absence.starts_at, {
    path: ["ends_at"],
    message: "El fin debe ser posterior al inicio",
  });
