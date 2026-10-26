"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";

import { createLocationAction, updateLocationDetailsAction } from "../actions";
import type { LocationDetail } from "../queries";
import styles from "./locations.module.css";

type Props = {
  slug: string;
  location?: Pick<LocationDetail, "id" | "name" | "address" | "whatsapp" | "is_active">;
};

export function LocationDetailsForm({ slug, location }: Props) {
  const action = location
    ? updateLocationDetailsAction.bind(null, slug, location.id)
    : createLocationAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (field: string, fallback?: string | null) =>
    state.values?.[field] ?? fallback ?? "";

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <Input
        label="Nombre del local"
        name="name"
        required
        defaultValue={value("name", location?.name)}
        error={state.fieldErrors?.name}
      />
      <Input
        label="Dirección"
        name="address"
        autoComplete="street-address"
        defaultValue={value("address", location?.address)}
      />
      <Input
        label="WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={value("whatsapp", location?.whatsapp)}
        error={state.fieldErrors?.whatsapp}
      />
      {location && (
        <label className={styles.checkbox}>
          <input type="checkbox" name="is_active" defaultChecked={location.is_active} />
          Local activo (visible para reservar)
        </label>
      )}
      <FormStatus state={state} />
      <Button type="submit" loading={pending}>
        {location ? "Guardar datos" : "Crear local"}
      </Button>
    </form>
  );
}
