import {
  COAT_TYPES,
  PET_SIZES,
  SPECIES,
  type CoatType,
  type PetSize,
  type Species,
} from "@/lib/pets/labels";

export const MAX_PETS_PER_STAFF = 100;

/** Nombre del campo del formulario para una celda de la matriz de capacidad. */
export const capacityFieldName = (species: Species, size: PetSize, coat: CoatType) =>
  `c.${species}.${size}.${coat}`;

export type CapacityRow = {
  species: Species;
  size: PetSize;
  coat: CoatType;
  pets_per_staff: number;
};

/**
 * Lee cuántas mascotas atiende un empleado al día por especie × talla × pelo (D31). Una celda vacía
 * significa que el local no recibe esa combinación.
 */
export function parseCapacityMatrix(formData: FormData) {
  const rows: CapacityRow[] = [];
  const errors: Record<string, string> = {};

  for (const species of SPECIES) {
    for (const size of PET_SIZES) {
      for (const coat of COAT_TYPES) {
        const field = capacityFieldName(species, size, coat);
        const raw = String(formData.get(field) ?? "").trim();
        if (raw === "") continue;
        const pets = Number(raw);
        if (!Number.isInteger(pets) || pets < 1)
          errors[field] = "Escribe un número entero (mínimo 1)";
        else if (pets > MAX_PETS_PER_STAFF) errors[field] = `Máximo ${MAX_PETS_PER_STAFF}`;
        else rows.push({ species, size, coat, pets_per_staff: pets });
      }
    }
  }
  return { rows, errors };
}
