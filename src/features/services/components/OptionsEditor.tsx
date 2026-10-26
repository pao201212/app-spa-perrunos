"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Badge, Button, Input, Select } from "@/components/ui";

import { addOptionAction, deleteOptionAction } from "../actions";
import type { ServiceDetail } from "../queries";
import { OPTION_STAGES, optionStageLabel } from "../schema";
import styles from "./services.module.css";

/** Opcionales sin costo que el cliente marca al reservar (D26). */
export function OptionsEditor({ slug, service }: { slug: string; service: ServiceDetail }) {
  const [state, action, pending] = useActionState(
    addOptionAction.bind(null, slug, service.id),
    initialFormState,
  );
  const options = [...service.service_options].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"),
  );
  const lastStage = state.values?.stage ?? "details";

  return (
    <div className={formStyles.form}>
      {options.length === 0 ? (
        <p className={styles.muted}>
          Aún no hay opcionales. Ej.: corte higiénico, shampoo hipoalergénico.
        </p>
      ) : (
        <ul className={styles.list}>
          {options.map((option) => (
            <li key={option.id} className={styles.row}>
              <strong className={styles.grow}>{option.name}</strong>
              <Badge tone={option.stage === "details" ? "primary" : "neutral"}>
                {optionStageLabel[option.stage]}
              </Badge>
              <form action={deleteOptionAction.bind(null, slug, service.id, option.id)}>
                <Button type="submit" variant="ghost">
                  Quitar<span className="visually-hidden"> {option.name}</span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className={formStyles.form} key={options.length} noValidate>
        <div className={styles.grid2}>
          <Input
            label="Nombre del opcional"
            name="name"
            defaultValue={state.status === "error" ? state.values?.name : ""}
            error={state.fieldErrors?.name}
          />
          <Select
            label="Etapa"
            name="stage"
            key={`stage-${lastStage}`}
            defaultValue={lastStage}
            error={state.fieldErrors?.stage}
          >
            {OPTION_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {optionStageLabel[stage]}
              </option>
            ))}
          </Select>
        </div>
        <FormStatus state={state} />
        <Button type="submit" variant="ghost" loading={pending}>
          Agregar opcional
        </Button>
      </form>
    </div>
  );
}
