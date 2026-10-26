import { z } from "zod";

import { COAT_TYPES, PET_SIZES, SPECIES, type PetSize } from "@/lib/pets/labels";

const kilos = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().replace(",", ".") : value),
  z
    .string()
    .min(1, "Escribe el peso máximo")
    .transform(Number)
    .pipe(z.number("Escribe un número").positive("Debe ser mayor que 0").max(300, "Máximo 300 kg")),
);

/** Umbrales de una especie: pesos máximos crecientes en el orden de las tallas. */
export function makeThresholdsSchema(sizes: readonly PetSize[]) {
  const shape = Object.fromEntries(sizes.map((size) => [size, kilos])) as Record<
    PetSize,
    typeof kilos
  >;
  return z.object(shape).superRefine((values, ctx) => {
    sizes.forEach((size, index) => {
      const previous = sizes[index - 1];
      if (previous && values[size] <= values[previous]) {
        ctx.addIssue({
          code: "custom",
          path: [size],
          message: `Debe ser mayor que ${values[previous]} kg (${previous})`,
        });
      }
    });
  });
}

export const ownBreedSchema = z.object({
  species: z.enum(SPECIES, "Elige una especie"),
  name: z.string().trim().min(2, "Escribe el nombre de la raza").max(60, "Máximo 60 caracteres"),
  size: z.enum(PET_SIZES, "Elige una talla"),
  coat: z.enum(COAT_TYPES, "Elige un tipo de pelo"),
});

export const tenantBreedEditSchema = z.object({
  size: z.enum(PET_SIZES, "Elige una talla"),
  coat: z.enum(COAT_TYPES, "Elige un tipo de pelo"),
  is_active: z.preprocess((value) => value === "on" || value === true, z.boolean()),
});
