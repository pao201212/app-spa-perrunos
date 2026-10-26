"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";
import { formatInZone } from "@/lib/timezone";

import { addAbsenceAction, removeAbsenceAction } from "../actions";
import type { StaffDetail } from "../queries";
import styles from "./staff.module.css";

type Props = { slug: string; member: StaffDetail; timeZone: string };

export function AbsencesEditor({ slug, member, timeZone }: Props) {
  const [state, action, pending] = useActionState(
    addAbsenceAction.bind(null, slug, member.id),
    initialFormState,
  );
  const absences = [...member.staff_absences].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );

  return (
    <div className={styles.editor}>
      {absences.length === 0 ? (
        <p className={styles.muted}>Sin ausencias registradas.</p>
      ) : (
        <ul className={styles.list}>
          {absences.map((absence) => {
            const range = `${formatInZone(absence.starts_at, timeZone)} → ${formatInZone(absence.ends_at, timeZone)}`;
            return (
              <li key={absence.id} className={styles.row}>
                <span className={styles.grow}>
                  <strong>{range}</strong>
                  {absence.reason && <span className={styles.muted}> · {absence.reason}</span>}
                </span>
                <form action={removeAbsenceAction.bind(null, slug, member.id, absence.id)}>
                  <Button type="submit" variant="ghost">
                    Quitar<span className="visually-hidden"> ausencia {range}</span>
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <form action={action} className={formStyles.form} noValidate key={absences.length}>
        <div className={styles.grid3}>
          <Input
            label="Desde"
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={state.values?.starts_at}
            error={state.fieldErrors?.starts_at}
          />
          <Input
            label="Hasta"
            name="ends_at"
            type="datetime-local"
            required
            defaultValue={state.values?.ends_at}
            error={state.fieldErrors?.ends_at}
          />
          <Input
            label="Motivo"
            name="reason"
            placeholder="Vacaciones, cita médica…"
            defaultValue={state.values?.reason}
          />
        </div>
        <FormStatus state={state} />
        <Button type="submit" variant="ghost" loading={pending}>
          Agregar ausencia
        </Button>
      </form>
    </div>
  );
}
