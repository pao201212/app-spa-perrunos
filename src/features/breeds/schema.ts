import { z } from "zod";

import { COAT_TYPES, PET_SIZES, SPECIES } from "@/lib/pets/labels";

export const breedFormSchema = z.object({
  species: z.enum(SPECIES, "Elige una especie"),
  name: z.string().trim().min(2, "Escribe el nombre de la raza").max(60, "Máximo 60 caracteres"),
  default_size: z.enum(PET_SIZES, "Elige una talla"),
  default_coat: z.enum(COAT_TYPES, "Elige un tipo de pelo"),
  // Checkbox HTML: "on" si está marcado, ausente si no.
  is_mixed: z.preprocess((value) => value === "on" || value === true, z.boolean()),
});

export type BreedForm = z.infer<typeof breedFormSchema>;
