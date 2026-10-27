"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import { Button, Input } from "@/components/ui";

import { assignAdminAction } from "../actions";
import styles from "@/components/forms/forms.module.css";

export function AssignAdminForm({ tenantId }: { tenantId: string }) {
  const [state, action, pending] = useActionState(
    assignAdminAction.bind(null, tenantId),
    initialFormState,
  );

  return (
    <form action={action} className={styles.form} noValidate>
      <Input
        label="Correo del administrador"
        name="email"
        type="email"
        autoComplete="off"
        required
        defaultValue={state.status === "error" ? state.values?.email : ""}
        key={state.status === "success" ? state.message : "form"}
        error={state.fieldErrors?.email}
      />
      <p role="status" className={state.status === "error" ? styles.error : styles.success}>
        {state.message}
      </p>
      <Button type="submit" loading={pending}>
        Agregar administrador
      </Button>
    </form>
  );
}
