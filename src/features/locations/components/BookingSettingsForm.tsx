"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input, Select } from "@/components/ui";

import { updateBookingSettingsAction } from "../actions";
import type { LocationDetail } from "../queries";
import { SLOT_STEPS } from "../schema";
import styles from "./locations.module.css";

export function BookingSettingsForm({
  slug,
  location,
}: {
  slug: string;
  location: LocationDetail;
}) {
  const [state, action, pending] = useActionState(
    updateBookingSettingsAction.bind(null, slug, location.id),
    initialFormState,
  );
  const value = (field: string, fallback: string | number) =>
    state.values?.[field] ?? String(fallback);

  return (
    <form action={action} className={formStyles.form} noValidate>
      <div className={styles.grid2}>
        <Select
          label="Confirmación de reservas"
          name="confirmation_mode"
          defaultValue={value("confirmation_mode", location.confirmation_mode)}
          error={state.fieldErrors?.confirmation_mode}
        >
          <option value="auto">Automática</option>
          <option value="manual">El admin confirma</option>
        </Select>
        <Select
          label="Intervalo de horarios"
          name="slot_step_min"
          defaultValue={value("slot_step_min", location.slot_step_min)}
          error={state.fieldErrors?.slot_step_min}
        >
          {SLOT_STEPS.map((step) => (
            <option key={step} value={step}>
              Cada {step} min
            </option>
          ))}
        </Select>
        <Input
          label="Cancelación hasta (horas antes)"
          name="cancel_window_hours"
          type="number"
          inputMode="numeric"
          min={0}
          max={168}
          defaultValue={value("cancel_window_hours", location.cancel_window_hours)}
          error={state.fieldErrors?.cancel_window_hours}
        />
        <Input
          label="Reservas hasta (días a futuro)"
          name="max_days_ahead"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          defaultValue={value("max_days_ahead", location.max_days_ahead)}
          error={state.fieldErrors?.max_days_ahead}
        />
      </div>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          name="bather_continues_drying"
          defaultChecked={location.bather_continues_drying}
        />
        Quien baña también seca a esa mascota
      </label>
      <FormStatus state={state} />
      <Button type="submit" loading={pending}>
        Guardar ajustes
      </Button>
    </form>
  );
}
