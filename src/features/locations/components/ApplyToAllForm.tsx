"use client";

import { useActionState, useId, useState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Dialog } from "@/components/ui";

import { applyToAllLocationsAction } from "../actions";
import { APPLY_SECTIONS } from "../schema";
import styles from "./locations.module.css";

const LABELS: Record<(typeof APPLY_SECTIONS)[number], string> = {
  booking: "Ajustes de reserva (reemplaza)",
  stations: "Estaciones (reemplaza)",
  hours: "Horario (reemplaza)",
  closures: "Días de cierre (se suman a los de cada local)",
};

type Props = { slug: string; locationId: string; otherLocations: number };

export function ApplyToAllForm({ slug, locationId, otherLocations }: Props) {
  const [state, action, pending] = useActionState(
    applyToAllLocationsAction.bind(null, slug, locationId),
    initialFormState,
  );
  const [confirming, setConfirming] = useState(false);
  const formId = useId();

  return (
    <form
      id={formId}
      action={action}
      className={formStyles.form}
      onSubmit={() => setConfirming(false)}
    >
      <fieldset className={styles.fieldset}>
        <legend className="visually-hidden">Qué aplicar</legend>
        {APPLY_SECTIONS.map((section) => (
          <label key={section} className={styles.checkbox}>
            <input
              type="checkbox"
              name="sections"
              value={section}
              defaultChecked={section !== "closures"}
            />
            {LABELS[section]}
          </label>
        ))}
      </fieldset>
      <FormStatus state={state} />
      <Button variant="secondary" loading={pending} onClick={() => setConfirming(true)}>
        Aplicar a todos los locales
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="¿Aplicar a todos los locales?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={formId}>
              Sí, aplicar
            </Button>
          </>
        }
      >
        <p>
          Se copiará la configuración marcada de este local a {otherLocations}{" "}
          {otherLocations === 1 ? "local más" : "locales más"} del spa. Lo marcado como “reemplaza”
          sobrescribe lo que esos locales tengan hoy.
        </p>
      </Dialog>
    </form>
  );
}
