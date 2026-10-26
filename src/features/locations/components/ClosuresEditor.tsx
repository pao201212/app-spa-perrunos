"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";
import { longDate } from "@/lib/dates";

import { addClosureAction, removeClosureAction } from "../actions";
import type { LocationDetail } from "../queries";
import styles from "./locations.module.css";

export function ClosuresEditor({ slug, location }: { slug: string; location: LocationDetail }) {
  const [state, action, pending] = useActionState(
    addClosureAction.bind(null, slug, location.id),
    initialFormState,
  );
  const closures = [...location.location_closures].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className={styles.editor}>
      {closures.length === 0 ? (
        <p className={styles.muted}>No hay días de cierre programados.</p>
      ) : (
        <ul className={styles.list}>
          {closures.map((closure) => (
            <li key={closure.id} className={styles.row}>
              <span className={styles.grow}>
                <strong>{longDate(closure.date)}</strong>
                {closure.reason && <span className={styles.muted}> · {closure.reason}</span>}
              </span>
              <form action={removeClosureAction.bind(null, slug, location.id, closure.id)}>
                <Button type="submit" variant="ghost">
                  Quitar
                  <span className="visually-hidden"> cierre del {longDate(closure.date)}</span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className={formStyles.form} noValidate key={closures.length}>
        <div className={styles.grid2}>
          <Input
            label="Fecha"
            name="date"
            type="date"
            required
            defaultValue={state.values?.date}
            error={state.fieldErrors?.date}
          />
          <Input
            label="Motivo"
            name="reason"
            placeholder="Festivo, vacaciones…"
            defaultValue={state.values?.reason}
          />
        </div>
        <FormStatus state={state} />
        <Button type="submit" variant="ghost" loading={pending}>
          Agregar cierre
        </Button>
      </form>
    </div>
  );
}
