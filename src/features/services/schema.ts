import { z } from "zod";

import type { Database } from "@/lib/db/types";

export type ServiceKind = Database["public"]["Enums"]["service_kind"];
export type ServiceSpecies = Database["public"]["Enums"]["service_species"];

export const SERVICE_KINDS = [
  "bath",
  "special_cut",
  "other",
] as const satisfies readonly ServiceKind[];
export const SERVICE_SPECIES = ["both", "dog", "cat"] as const satisfies readonly ServiceSpecies[];

export const kindLabel: Record<ServiceKind, string> = {
  bath: "Baño",
  special_cut: "Corte especial",
  other: "Otro",
};

export const kindDescription: Record<ServiceKind, string> = {
  bath: "Pasa por baño, secado y terminado.",
  special_cut: "Lo hace el groomer después del terminado del baño.",
  other: "Se hace en la estación de terminado (p. ej. corte de uñas).",
};

export const serviceSpeciesLabel: Record<ServiceSpecies, string> = {
  both: "Perros y gatos",
  dog: "Solo perros",
  cat: "Solo gatos",
};

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del servicio").max(60, "Máximo 60 caracteres"),
  kind: z.enum(SERVICE_KINDS, "Elige el tipo de servicio"),
  species: z.enum(SERVICE_SPECIES, "Elige para qué mascotas aplica"),
  category_id: z.preprocess(emptyToNull, z.uuid().nullable().default(null)),
  description: z.preprocess(emptyToNull, z.string().trim().max(300).nullable().default(null)),
  is_active: z.preprocess((value) => value === "on" || value === true, z.boolean()),
});

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe el nombre de la categoría")
    .max(40, "Máximo 40 caracteres"),
});

export const extraSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del extra").max(60, "Máximo 60 caracteres"),
  extra_minutes: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? 0 : Number(value)),
    z
      .number("Escribe los minutos")
      .int()
      .min(0)
      .max(240, "Máximo 240 minutos")
      .refine((minutes) => minutes % 5 === 0, "Usa múltiplos de 5"),
  ),
});
