"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button } from "@/components/ui";

import { createPetGroupAction, deletePetGroupAction } from "../admin-actions";
import type { PetGroup } from "../admin-queries";
import styles from "./customers.module.css";

type Props = {
  slug: string;
  customerId: string;
  groups: PetGroup[];
  pets: { id: string; name: string }[];
};

/** Mascotas del mismo dueño que se bañan a la vez: comparten tina, cada una con su mesa de secado (D23). */
export function PetGroupsEditor({ slug, customerId, groups, pets }: Props) {
  const [state, action, pending] = useActionState(
    createPetGroupAction.bind(null, slug, customerId),
    initialFormState,
  );
  const grouped = new Set(groups.flatMap((group) => group.petIds));
  const available = pets.filter((pet) => !grouped.has(pet.id));
  const selected = state.status === "error" ? (state.values?.pet_ids ?? "") : "";
  const selectedIds = new Set(selected.split(","));

  return (
    <div className={formStyles.form}>
      {groups.length > 0 && (
        <ul className={styles.groupList}>
          {groups.map((group) => {
            const label = group.names.join(" y ");
            return (
              <li key={group.id} className={styles.groupRow}>
                <strong>{label}</strong>
                <form action={deletePetGroupAction.bind(null, slug, customerId, group.id)}>
                  <Button type="submit" variant="ghost">
                    Separar<span className="visually-hidden"> a {label}</span>
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {available.length >= 2 ? (
        <form action={action} className={formStyles.form} key={`${groups.length}-${selected}`}>
          <fieldset className={styles.override}>
            <legend className={styles.legend}>Mascotas que entran juntas a la tina</legend>
            {available.map((pet) => (
              <label key={pet.id} className={styles.checkbox}>
                <input
                  type="checkbox"
                  name="pet_ids"
                  value={pet.id}
                  defaultChecked={selectedIds.has(pet.id)}
                />
                {pet.name}
              </label>
            ))}
          </fieldset>
          <FormStatus state={state} />
          <Button type="submit" variant="ghost" loading={pending}>
            Agrupar
          </Button>
        </form>
      ) : (
        groups.length === 0 && (
          <p className={styles.muted}>Se necesitan al menos dos mascotas para agrupar.</p>
        )
      )}
    </div>
  );
}
