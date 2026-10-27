"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input, Select } from "@/components/ui";
import {
  COAT_TYPES,
  coatLabel,
  PET_SIZES,
  sizeLabel,
  SPECIES,
  speciesLabel,
} from "@/lib/pets/labels";

import { createOwnBreedAction, updateTenantBreedAction } from "../actions";
import type { TenantBreed } from "../queries";
import styles from "./pet-catalog.module.css";

type Props = { slug: string; breed?: TenantBreed };

/** Sin `breed`: crea una raza propia. Con `breed`: ajusta talla, pelo y visibilidad. */
export function TenantBreedForm({ slug, breed }: Props) {
  const action = breed
    ? updateTenantBreedAction.bind(null, slug, breed.id)
    : createOwnBreedAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (field: string, fallback: string) => state.values?.[field] ?? fallback;

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      {!breed && (
        <>
          <Input
            label="Nombre de la raza"
            name="name"
            required
            defaultValue={value("name", "")}
            error={state.fieldErrors?.name}
          />
          <Select
            label="Especie"
            name="species"
            defaultValue={value("species", "dog")}
            error={state.fieldErrors?.species}
          >
            {SPECIES.map((species) => (
              <option key={species} value={species}>
                {speciesLabel[species]}
              </option>
            ))}
          </Select>
        </>
      )}
      <Select
        label="Talla"
        name="size"
        defaultValue={value("size", breed?.size ?? "M")}
        error={state.fieldErrors?.size}
      >
        {PET_SIZES.map((size) => (
          <option key={size} value={size}>
            {sizeLabel[size]}
          </option>
        ))}
      </Select>
      <Select
        label="Pelo"
        name="coat"
        defaultValue={value("coat", breed?.coat ?? "short")}
        error={state.fieldErrors?.coat}
      >
        {COAT_TYPES.map((coat) => (
          <option key={coat} value={coat}>
            {coatLabel[coat]}
          </option>
        ))}
      </Select>
      {breed && (
        <label className={styles.checkbox}>
          <input type="checkbox" name="is_active" defaultChecked={breed.is_active} />
          Visible para los clientes
        </label>
      )}
      <FormStatus state={state} />
      <Button type="submit" size="lg" loading={pending}>
        {breed ? "Guardar raza" : "Crear raza"}
      </Button>
    </form>
  );
}
