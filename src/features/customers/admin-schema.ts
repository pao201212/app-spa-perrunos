import { z } from "zod";

import { COAT_TYPES, PET_SIZES } from "@/lib/pets/labels";

import { WHATSAPP_PATTERN } from "./schema";

/**
 * Texto de búsqueda seguro para el filtro `or()` de PostgREST: se quitan los caracteres que
 * separan condiciones o actúan como comodines (`,` `(` `)` `%` `*` `"` `\`).
 */
export function sanitizeSearch(query: string | undefined | null): string {
  return (query ?? "")
    .replace(/[,()%*"\\]/g, "")
    .trim()
    .slice(0, 60);
}

export const adminCustomerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Escribe el nombre del cliente")
    .max(80, "Máximo 80 caracteres"),
  whatsapp: z
    .string()
    .trim()
    .regex(WHATSAPP_PATTERN, "Escribe un WhatsApp válido, p. ej. +57 300 123 4567"),
  email: z.preprocess(
    (value) =>
      typeof value === "string" ? (value.trim() === "" ? null : value.trim().toLowerCase()) : value,
    z.email("Escribe un correo válido").nullable().default(null),
  ),
});

/** Solo staff: fijar talla y pelo a mano (el cálculo automático deja de aplicarse). */
export const petOverrideSchema = z.object({
  size_locked: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  size: z.enum(PET_SIZES).optional(),
  coat: z.enum(COAT_TYPES).optional(),
});
