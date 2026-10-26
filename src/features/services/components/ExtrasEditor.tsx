"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Badge, Button, Input } from "@/components/ui";

import { addExtraAction, toggleExtraAction } from "../actions";
import type { ServiceDetail } from "../queries";
import styles from "./services.module.css";

export function ExtrasEditor({ slug, service }: { slug: string; service: ServiceDetail }) {
  const [state, action, pending] = useActionState(
    addExtraAction.bind(null, slug, service.id),
    initialFormState,
  );
  const extras = [...service.extras].sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <div className={formStyles.form}>
      {extras.length === 0 ? (
        <p className={styles.muted}>Este servicio no tiene extras.</p>
      ) : (
        <ul className={styles.list}>
          {extras.map((extra) => (
            <li key={extra.id} className={styles.row}>
              <span className={styles.grow}>
                <strong>{extra.name}</strong>
                <span className={styles.muted}>
                  {" · "}
                  {extra.extra_minutes > 0 ? `+${extra.extra_minutes} min` : "sin tiempo adicional"}
                </span>
              </span>
              {!extra.is_active && <Badge tone="neutral">Inactivo</Badge>}
              <form
                action={toggleExtraAction.bind(null, slug, service.id, extra.id, !extra.is_active)}
              >
                <Button type="submit" variant="ghost">
                  {extra.is_active ? "Desactivar" : "Activar"}
                  <span className="visually-hidden"> {extra.name}</span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className={formStyles.form} key={extras.length} noValidate>
        <div className={styles.grid2}>
          <Input
            label="Nombre del extra"
            name="name"
            defaultValue={state.values?.name}
            error={state.fieldErrors?.name}
          />
          <Input
            label="Minutos adicionales"
            name="extra_minutes"
            inputMode="numeric"
            hint="Se suman al terminado. Déjalo vacío si no añade tiempo."
            defaultValue={state.values?.extra_minutes}
            error={state.fieldErrors?.extra_minutes}
          />
        </div>
        <FormStatus state={state} />
        <Button type="submit" variant="ghost" loading={pending}>
          Agregar extra
        </Button>
      </form>
    </div>
  );
}
