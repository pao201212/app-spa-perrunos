"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input, Select } from "@/components/ui";
import { shortTime, WEEKDAY_LABELS, WEEKDAYS_MONDAY_FIRST } from "@/lib/dates";

import { addHourRangeAction, removeHourRangeAction } from "../actions";
import type { LocationDetail } from "../queries";
import styles from "./locations.module.css";

export function HoursEditor({ slug, location }: { slug: string; location: LocationDetail }) {
  const [state, action, pending] = useActionState(
    addHourRangeAction.bind(null, slug, location.id),
    initialFormState,
  );
  // React reinicia el formulario tras cada envío: el select se remonta con el último día usado.
  const lastWeekday = state.values?.weekday ?? "1";
  const rangesFor = (weekday: number) =>
    location.location_hours
      .filter((h) => h.weekday === weekday)
      .sort((a, b) => a.opens_at.localeCompare(b.opens_at));

  return (
    <div className={styles.editor}>
      <ul className={styles.list}>
        {WEEKDAYS_MONDAY_FIRST.map((weekday) => {
          const ranges = rangesFor(weekday);
          return (
            <li key={weekday} className={styles.row}>
              <strong className={styles.day}>{WEEKDAY_LABELS[weekday]}</strong>
              {ranges.length === 0 ? (
                <span className={styles.muted}>Cerrado</span>
              ) : (
                <span className={styles.chips}>
                  {ranges.map((range) => {
                    const label = `${shortTime(range.opens_at)} – ${shortTime(range.closes_at)}`;
                    return (
                      <form
                        key={range.id}
                        action={removeHourRangeAction.bind(null, slug, location.id, range.id)}
                        className={styles.chip}
                      >
                        {label}
                        <button type="submit" className={styles.chipRemove}>
                          ×
                          <span className="visually-hidden">
                            Quitar tramo {WEEKDAY_LABELS[weekday]} {label}
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
        <div className={styles.grid3}>
          <Select
            label="Día"
            name="weekday"
            key={`weekday-${lastWeekday}`}
            defaultValue={lastWeekday}
            error={state.fieldErrors?.weekday}
          >
            {WEEKDAYS_MONDAY_FIRST.map((weekday) => (
              <option key={weekday} value={weekday}>
                {WEEKDAY_LABELS[weekday]}
              </option>
            ))}
          </Select>
          <Input
            label="Abre"
            name="opens_at"
            type="time"
            required
            defaultValue={state.values?.opens_at ?? "08:00"}
            error={state.fieldErrors?.opens_at}
          />
          <Input
            label="Cierra"
            name="closes_at"
            type="time"
            required
            defaultValue={state.values?.closes_at ?? "12:00"}
            error={state.fieldErrors?.closes_at}
          />
        </div>
        <FormStatus state={state} />
        <Button type="submit" variant="ghost" loading={pending}>
          Agregar tramo
        </Button>
      </form>
    </div>
  );
}
