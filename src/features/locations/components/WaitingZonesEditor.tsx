"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";

import { addWaitingZoneAction, removeWaitingZoneAction } from "../actions";
import type { LocationDetail } from "../queries";
import styles from "./locations.module.css";

const pets = (n: number) => `${n} ${n === 1 ? "mascota" : "mascotas"}`;

/** Zonas donde esperan las mascotas: limitan cuántas hay a la vez en el local (D33). */
export function WaitingZonesEditor({ slug, location }: { slug: string; location: LocationDetail }) {
  const [state, action, pending] = useActionState(
    addWaitingZoneAction.bind(null, slug, location.id),
    initialFormState,
  );
  const zones = [...location.location_waiting_zones].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { numeric: true }),
  );
  const seats = zones.reduce((total, zone) => total + zone.seats, 0);

  return (
    <div className={styles.editor}>
      {zones.length === 0 ? (
        <p className={styles.muted}>
          Sin zonas de espera: a la vez solo puede haber tantas mascotas como empleados en turno.
        </p>
      ) : (
        <>
          <ul className={styles.list}>
            {zones.map((zone) => (
              <li key={zone.id} className={styles.row}>
                <span className={styles.grow}>
                  <strong>{zone.name}</strong>
                  <span className={styles.muted}> · {pets(zone.seats)}</span>
                </span>
                <form action={removeWaitingZoneAction.bind(null, slug, location.id, zone.id)}>
                  <Button type="submit" variant="ghost">
                    Quitar<span className="visually-hidden"> {zone.name}</span>
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <p className={styles.muted} role="note">
            A la vez puede haber hasta <strong>empleados en turno + {pets(seats)}</strong>.
          </p>
        </>
      )}

      <form action={action} className={formStyles.form} noValidate key={zones.length}>
        <div className={styles.grid2}>
          <Input
            label="Nombre de la zona"
            name="name"
            placeholder="Sala de espera, patio…"
            defaultValue={state.values?.name}
            error={state.fieldErrors?.name}
          />
          <Input
            label="Mascotas que caben"
            name="seats"
            inputMode="numeric"
            defaultValue={state.values?.seats}
            error={state.fieldErrors?.seats}
          />
        </div>
        <FormStatus state={state} />
        <Button type="submit" variant="ghost" loading={pending}>
          Agregar zona
        </Button>
      </form>
    </div>
  );
}
