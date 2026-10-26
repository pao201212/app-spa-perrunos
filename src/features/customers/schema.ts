import { z } from "zod";

import { COAT_TYPES, SPECIES } from "@/lib/pets/labels";

export const WHATSAPP_PATTERN = /^\+?[\d\s-]{7,20}$/;

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Escribe tu nombre").max(80, "Máximo 80 caracteres"),
  whatsapp: z
    .string()
    .trim()
    .regex(WHATSAPP_PATTERN, "Escribe tu WhatsApp, p. ej. +57 300 123 4567"),
});

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

export const petFormSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de tu mascota").max(40, "Máximo 40 caracteres"),
  species: z.enum(SPECIES, "Elige perro o gato"),
  breed_id: z.uuid("Elige la raza"),
  weight_kg: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.trim() === ""
          ? null
          : Number(value.replace(",", "."))
        : value,
    z
      .number("Escribe el peso en kg")
      .positive("El peso debe ser mayor que 0")
      .max(150, "Máximo 150 kg")
      .nullable()
      .default(null),
  ),
  coat: z.preprocess(emptyToNull, z.enum(COAT_TYPES).nullable().default(null)),
  gender: z.preprocess(emptyToNull, z.enum(["female", "male"]).nullable().default(null)),
});

export type PetForm = z.infer<typeof petFormSchema>;

export const PET_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// El navegador reduce la foto antes de enviarla (compressImage); este es el tope en el servidor.
// Debe quedar por debajo de serverActions.bodySizeLimit (next.config.ts) y del límite de Vercel (4,5 MB).
export const PET_PHOTO_MAX_BYTES = 3 * 1024 * 1024;

/** Mensaje de error de la foto, o null si es válida. */
export function petPhotoError(file: File): string | null {
  if (!(PET_PHOTO_TYPES as readonly string[]).includes(file.type))
    return "La foto debe ser JPG, PNG o WebP";
  if (file.size > PET_PHOTO_MAX_BYTES) return "La foto no puede pesar más de 3 MB";
  return null;
}
