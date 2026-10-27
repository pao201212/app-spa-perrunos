"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";

import { saveProfileAction } from "../actions";

type Props = {
  slug: string;
  next: string | null;
  defaults: { full_name: string; whatsapp: string };
};

export function ProfileForm({ slug, next, defaults }: Props) {
  const [state, action, pending] = useActionState(
    saveProfileAction.bind(null, slug, next),
    initialFormState,
  );

  return (
    <form action={action} className={formStyles.form} noValidate>
      <Input
        label="Nombre completo"
        name="full_name"
        autoComplete="name"
        required
        defaultValue={state.values?.full_name ?? defaults.full_name}
        error={state.fieldErrors?.full_name}
      />
      <Input
        label="WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        hint="Te escribiremos por aquí para confirmar tus citas."
        defaultValue={state.values?.whatsapp ?? defaults.whatsapp}
        error={state.fieldErrors?.whatsapp}
      />
      <FormStatus state={state} />
      <Button type="submit" size="lg" loading={pending}>
        Guardar perfil
      </Button>
    </form>
  );
}
