"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";

import { updateStationsAction } from "../actions";
import type { LocationDetail } from "../queries";
import styles from "./locations.module.css";

const STATIONS = [
  { key: "bath", label: "Estaciones de baño" },
  { key: "dry", label: "Mesas de secado y detalles" },
  { key: "cut", label: "Estaciones de corte" },
] as const;

export function StationsForm({ slug, location }: { slug: string; location: LocationDetail }) {
  const [state, action, pending] = useActionState(
    updateStationsAction.bind(null, slug, location.id),
    initialFormState,
  );
  const current = (station: string) =>
    state.values?.[station] ??
    String(location.location_stations.find((s) => s.station === station)?.count ?? 0);

  return (
    <form action={action} className={formStyles.form} noValidate>
      <div className={styles.grid3}>
        {STATIONS.map(({ key, label }) => (
          <Input
            key={key}
            label={label}
            name={key}
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            defaultValue={current(key)}
            error={state.fieldErrors?.[key]}
          />
        ))}
      </div>
      <FormStatus state={state} />
      <Button type="submit" loading={pending}>
        Guardar estaciones
      </Button>
    </form>
  );
}
