import type { Database } from "@/lib/db/types";

export type Species = Database["public"]["Enums"]["pet_species"];
export type PetSize = Database["public"]["Enums"]["pet_size"];
export type CoatType = Database["public"]["Enums"]["coat_type"];

export const SPECIES = ["dog", "cat"] as const satisfies readonly Species[];
export const PET_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const satisfies readonly PetSize[];
export const COAT_TYPES = ["short", "medium", "long"] as const satisfies readonly CoatType[];

export const speciesLabel: Record<Species, string> = { dog: "Perro", cat: "Gato" };

export const sizeLabel: Record<PetSize, string> = {
  XS: "Mini (XS)",
  S: "Pequeño (S)",
  M: "Mediano (M)",
  L: "Grande (L)",
  XL: "Muy grande (XL)",
  XXL: "Gigante (XXL)",
};

export const coatLabel: Record<CoatType, string> = {
  short: "Corto",
  medium: "Medio",
  long: "Largo",
};
