"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input, Select } from "@/components/ui";
import { shortTime, WEEKDAY_LABELS, WEEKDAYS_MONDAY_FIRST } from "@/lib/dates";

import { addShiftAction, removeShiftAction } from "../actions";
import type { StaffDetail } from "../queries";
import styles from "./staff.module.css";

type Props = { slug: string; member: StaffDetail; locations: { id: string; name: string }[] };

export function ShiftsEditor({ slug, member, locations }: Props) {
  const [state, action, pending] = useActionState(
    addShiftAction.bind(null, slug, member.id),
    initialFormState,
  );
  // React reinicia el formulario tras cada envío (incluso campos controlados). La acción devuelve
  // el local y el día usados, y los selects se remontan con ellos como valor por defecto.
  const lastLocation = state.values?.location_id ?? locations[0]?.id;
  const lastWeekday = state.values?.weekday ?? "1";

  if (locations.length === 0) {
    return <p className={styles.muted}>Primero crea un local para poder asignar turnos.</p>;
  }

  return (
    <div className={styles.editor}>
      <ul className={styles.list}>
        {WEEKDAYS_MONDAY_FIRST.map((weekday) => {
          const shifts = member.staff_shifts
            .filter((s) => s.weekday === weekday)
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          return (
            <li key={weekday} className={styles.row}>
              <strong className={styles.day}>{WEEKDAY_LABELS[weekday]}</strong>
              {shifts.length === 0 ? (
                <span className={styles.muted}>Libre</span>
              ) : (
                <span className={styles.chips}>
                  {shifts.map((shift) => {
                    const label = `${shortTime(shift.starts_at)} – ${shortTime(shift.ends_at)} · ${shift.locations.name}`;
                    return (
                      <form
                        key={shift.id}
                        action={removeShiftAction.bind(null, slug, member.id, shift.id)}
                        className={styles.chip}
                      >
                        {label}
                        <button type="submit" className={styles.chipRemove}>
                          ×
                          <span className="visually-hidden">
                            Quitar turno {WEEKDAY_LABELS[weekday]} {label}
                          </span>
                        </button>
                      </form>
                    );
                  })}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <form action={action} className={formStyles.form} noValidate>
        <div className={styles.grid4}>
          <Select
            label="Local"
            name="location_id"
            key={`location-${lastLocation}`}
            defaultValue={lastLocation}
            error={state.fieldErrors?.location_id}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
          <Select
            label="Día"
            name="weekday"
            key={`weekday-${lastWeekday}`}
            defaultValue={lastWeekday}
          >
            {WEEKDAYS_MONDAY_FIRST.map((weekday) => (
              <option key={weekday} value={weekday}>
                {WEEKDAY_LABELS[weekday]}
              </option>
            ))}
          </Select>
          <Input
            label="Inicio"
            name="starts_at"
            type="time"
            required
            defaultValue={state.values?.starts_at ?? "08:00"}
            error={state.fieldErrors?.starts_at}
          />
          <Input
            label="Fin"
            name="ends_at"
            type="time"
            required
            defaultValue={state.values?.ends_at ?? "12:00"}
            error={state.fieldErrors?.ends_at}
          />
        </div>
        <FormStatus state={state} />
        <Button type="submit" variant="ghost" loading={pending}>
          Agregar turno
        </Button>
      </form>
    </div>
  );
}
