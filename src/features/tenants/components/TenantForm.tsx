"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import { Button, Input } from "@/components/ui";

import { createTenantAction } from "../actions";
import styles from "@/components/forms/forms.module.css";

export function TenantForm() {
  const [state, action, pending] = useActionState(createTenantAction, initialFormState);
  const value = (field: string, fallback = "") => state.values?.[field] ?? fallback;

  return (
    <form action={action} className={styles.form} noValidate>
      <Input
        label="Nombre del spa"
        name="name"
        required
        defaultValue={value("name")}
        error={state.fieldErrors?.name}
      />
      <Input
        label="Subdominio"
        name="slug"
        required
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        hint="Quedará en {subdominio}.prismalab.com.co"
        defaultValue={value("slug")}
        error={state.fieldErrors?.slug}
      />
      <Input
        label="Zona horaria"
        name="timezone"
        required
        defaultValue={value("timezone", "America/Bogota")}
        error={state.fieldErrors?.timezone}
      />
      <Input
        label="Moneda"
        name="currency"
        required
        maxLength={3}
        autoCapitalize="characters"
        defaultValue={value("currency", "COP")}
        error={state.fieldErrors?.currency}
      />
      {state.message && (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending}>
        Crear spa
      </Button>
    </form>
  );
}
