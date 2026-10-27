"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import { Button, Input, Select } from "@/components/ui";
import {
  COAT_TYPES,
  coatLabel,
  PET_SIZES,
  sizeLabel,
  SPECIES,
  speciesLabel,
} from "@/lib/pets/labels";

import { saveBreedAction } from "../actions";
import type { GlobalBreed } from "../queries";
import formStyles from "@/components/forms/forms.module.css";
import styles from "./breeds.module.css";

export function BreedForm({ breed }: { breed?: GlobalBreed }) {
  const [state, action, pending] = useActionState(
    saveBreedAction.bind(null, breed?.id ?? null),
    initialFormState,
  );
  const value = (field: string, fallback = "") => state.values?.[field] ?? fallback;
  const mixed = state.values ? state.values.is_mixed === "on" : (breed?.is_mixed ?? false);

  return (
    <form action={action} className={formStyles.form} noValidate>
      <Input
        label="Nombre de la raza"
        name="name"
        required
        defaultValue={value("name", breed?.name)}
        error={state.fieldErrors?.name}
      />
      <Select
        label="Especie"
        name="species"
        required
        defaultValue={value("species", breed?.species ?? "dog")}
        error={state.fieldErrors?.species}
      >
        {SPECIES.map((species) => (
          <option key={species} value={species}>
            {speciesLabel[species]}
          </option>
        ))}
      </Select>
      <Select
        label="Talla por defecto"
        name="default_size"
        required
        defaultValue={value("default_size", breed?.default_size ?? "M")}
        error={state.fieldErrors?.default_size}
      >
        {PET_SIZES.map((size) => (
          <option key={size} value={size}>
            {sizeLabel[size]}
          </option>
        ))}
      </Select>
      <Select
        label="Pelo por defecto"
        name="default_coat"
        required
        defaultValue={value("default_coat", breed?.default_coat ?? "short")}
        error={state.fieldErrors?.default_coat}
      >
        {COAT_TYPES.map((coat) => (
          <option key={coat} value={coat}>
            {coatLabel[coat]}
          </option>
        ))}
      </Select>
      <label className={styles.checkbox}>
        <input type="checkbox" name="is_mixed" defaultChecked={mixed} />
        Criollo / mestizo (la talla sale del peso y el cliente elige el pelo)
      </label>
      {state.message && (
        <p role="alert" className={formStyles.error}>
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending}>
        Guardar raza
      </Button>
    </form>
  );
}
