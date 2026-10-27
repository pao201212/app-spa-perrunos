"use client";

import { ChevronDown } from "lucide-react";
import { useActionState, useState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { COAT_TYPES, coatLabel, PET_SIZES, sizeLabel, type PetSize } from "@/lib/pets/labels";

import { saveDurationsAction } from "../actions";
import { durationFieldName, stageLabel, stagesFor } from "../duration-matrix";
import type { ServiceDuration } from "../queries";
import type { ServiceKind } from "../schema";
import styles from "./matrix.module.css";

type Props = { slug: string; serviceId: string; kind: ServiceKind; durations: ServiceDuration[] };

/**
 * Matriz talla × pelo × etapa. En móvil cada talla es un acordeón; desde 1024px se ven todas.
 * Es un único formulario: los campos de tallas plegadas también se envían.
 */
export function DurationMatrixForm({ slug, serviceId, kind, durations }: Props) {
  const [state, action, pending] = useActionState(
    saveDurationsAction.bind(null, slug, serviceId, kind),
    initialFormState,
  );
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [open, setOpen] = useState<Set<PetSize>>(new Set());
  const stages = stagesFor(kind);

  // Las tallas con errores se muestran abiertas para que se vean en móvil.
  const sizesWithErrors = new Set(
    Object.keys(state.fieldErrors ?? {}).map((field) => field.split(".")[1] as PetSize),
  );

  const saved = (size: PetSize, coat: string, stage: (typeof stages)[number]) =>
    durations.find((d) => d.size === size && d.coat === coat)?.[stage]?.toString() ?? "";
  const valueOf = (size: PetSize, coat: string, stage: (typeof stages)[number]) => {
    const field = durationFieldName(size, coat as never, stage);
    return state.values ? (state.values[field] ?? "") : saved(size, coat, stage);
  };
  const configured = (size: PetSize) =>
    COAT_TYPES.filter((coat) => stages.every((stage) => valueOf(size, coat, stage) !== "")).length;

  return (
    <form action={action} className={styles.form} noValidate>
      {PET_SIZES.map((size) => {
        const expanded = isDesktop || open.has(size) || sizesWithErrors.has(size);
        const panelId = `durations-${size}`;
        return (
          <div key={size} className={cx(styles.size, expanded && styles.open)}>
            <button
              type="button"
              className={styles.toggle}
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() =>
                !isDesktop &&
                setOpen((current) => {
                  const next = new Set(current);
                  if (next.has(size)) next.delete(size);
                  else next.add(size);
                  return next;
                })
              }
            >
              <span className={styles.sizeName}>{sizeLabel[size]}</span>
              <span className={styles.summary}>
                {configured(size)} de {COAT_TYPES.length}
              </span>
              <ChevronDown aria-hidden="true" className={styles.chevron} />
            </button>
            <div id={panelId} className={styles.panel}>
              <div
                className={styles.grid}
                style={{ "--stages": stages.length } as React.CSSProperties}
              >
                <span className={styles.corner}>Pelo</span>
                {stages.map((stage) => (
                  <span key={stage} className={styles.colHeader}>
                    {stageLabel[stage]} (min)
                  </span>
                ))}
                {COAT_TYPES.map((coat) => (
                  <div key={coat} className={styles.row}>
                    <span className={styles.rowHeader}>{coatLabel[coat]}</span>
                    {stages.map((stage) => {
                      const field = durationFieldName(size, coat, stage);
                      const error = state.fieldErrors?.[field];
                      return (
                        <span key={stage} className={styles.cell}>
                          <input
                            name={field}
                            inputMode="numeric"
                            aria-label={`${sizeLabel[size]} · ${coatLabel[coat]} · ${stageLabel[stage]}`}
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? `${field}-error` : undefined}
                            defaultValue={valueOf(size, coat, stage)}
                            key={`${field}-${state.values?.[field] ?? "saved"}`}
                            className={styles.input}
                          />
                          {error && (
                            <span id={`${field}-error`} className={styles.error}>
                              {error}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      <p className={styles.help}>Deja una fila vacía si ese pelo no se atiende en esa talla.</p>
      <FormStatus state={state} />
      <Button type="submit" loading={pending}>
        Guardar duraciones
      </Button>
    </form>
  );
}
