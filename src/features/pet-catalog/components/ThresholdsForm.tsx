"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";
import { sizeLabel, speciesLabel, type Species } from "@/lib/pets/labels";

import { saveThresholdsAction } from "../actions";
import type { SizeThreshold } from "../queries";
import styles from "./pet-catalog.module.css";

type Props = { slug: string; species: Species; thresholds: SizeThreshold[] };

export function ThresholdsForm({ slug, species, thresholds }: Props) {
  const [state, action, pending] = useActionState(
    saveThresholdsAction.bind(null, slug, species),
    initialFormState,
  );
  const rows = thresholds.filter((t) => t.species === species);
  const plural = `${speciesLabel[species]}s`;

  return (
    <form action={action} className={formStyles.form} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{plural}</legend>
        <div className={styles.thresholds}>
          {rows.map(({ size, max_kg }) => (
            <Input
              key={size}
              label={sizeLabel[size]}
              name={size}
              inputMode="decimal"
              hint="Hasta (kg)"
              defaultValue={state.values?.[size] ?? String(max_kg)}
              error={state.fieldErrors?.[size]}
            />
          ))}
        </div>
      </fieldset>
      <FormStatus state={state} />
      <Button type="submit" variant="ghost" loading={pending}>
        Guardar tallas de {plural.toLowerCase()}
      </Button>
    </form>
  );
}
