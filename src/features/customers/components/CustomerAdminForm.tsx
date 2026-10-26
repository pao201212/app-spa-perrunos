"use client";

import { useActionState } from "react";

import { initialFormState, type FormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";

import type { StaffCustomer } from "../admin-queries";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  customer?: StaffCustomer;
};

export function CustomerAdminForm({ action, customer }: Props) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (field: string, fallback?: string | null) =>
    state.values?.[field] ?? fallback ?? "";

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <Input
        label="Nombre completo"
        name="full_name"
        required
        autoComplete="off"
        defaultValue={value("full_name", customer?.full_name)}
        error={state.fieldErrors?.full_name}
      />
      <Input
        label="WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        required
        defaultValue={value("whatsapp", customer?.whatsapp)}
        error={state.fieldErrors?.whatsapp}
      />
      <Input
        label="Correo (para vincular su cuenta de Google)"
        name="email"
        type="email"
        autoComplete="off"
        hint="Cuando ingrese con este correo verá sus mascotas y citas."
        defaultValue={value("email", customer?.email)}
        error={state.fieldErrors?.email}
      />
      <FormStatus state={state} />
      <Button type="submit" loading={pending}>
        {customer ? "Guardar datos" : "Inscribir cliente"}
      </Button>
    </form>
  );
}
