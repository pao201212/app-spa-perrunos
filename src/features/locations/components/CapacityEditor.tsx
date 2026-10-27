"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import { FormStatus } from "@/components/forms/FormStatus";
import { Badge, Button } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import matrixStyles from "@/features/services/components/matrix.module.css";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
  COAT_TYPES,
  coatLabel,
  PET_SIZES,
  sizeLabel,
  SPECIES,
  speciesLabel,
  type CoatType,
  type PetSize,
  type Species,
} from "@/lib/pets/labels";

import { saveCapacityAction } from "../actions";
import { capacityFieldName } from "../capacity-matrix";
import type { LocationDetail } from "../queries";
import styles from "./locations.module.css";

/** Modo de capacidad (D30) y matriz "mascotas por empleado al día" (D31). */
export function CapacityEditor({ slug, location }: { slug: string; location: LocationDetail }) {
  return (
    <div className={styles.editor}>
      <ul className={styles.modes} aria-label="Modo de capacidad">
        <li className={cx(styles.mode, styles.modeActive)}>
          <span className={styles.titleRow}>
            <strong>Simple</strong>
            <Badge tone="success">Activa</Badge>
          </span>
          <span className={styles.muted}>
            Se calcula con los empleados que bañan cada día (según Personal) y cuántas mascotas
            atiende cada uno.
          </span>
        </li>
        <li className={styles.mode}>
          <span className={styles.titleRow}>
            <strong>Avanzada</strong>
            <Badge tone="neutral">Próximamente</Badge>
          </span>
          <span className={styles.muted}>
            Calculará cada etapa con las tinas, las mesas y las habilidades del personal.
          </span>
        </li>
      </ul>
      <CapacityMatrixForm slug={slug} location={location} />
      <p>
        <Link href={`/admin/locales/${location.id}/disponibilidad`}>
          ¿Por qué no hay cupo? Ver las horas de un día
        </Link>
      </p>
    </div>
  );
}

/**
 * Matriz talla × pelo × especie. En móvil cada talla es un acordeón; desde 1024px se ven todas.
 * Es un único formulario: los campos de tallas plegadas también se envían.
 */
function CapacityMatrixForm({ slug, location }: { slug: string; location: LocationDetail }) {
  const [state, action, pending] = useActionState(
    saveCapacityAction.bind(null, slug, location.id),
    initialFormState,
  );
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [open, setOpen] = useState<Set<PetSize>>(new Set());

  const sizesWithErrors = new Set(
    Object.keys(state.fieldErrors ?? {}).map((field) => field.split(".")[2] as PetSize),
  );
  const valueOf = (species: Species, size: PetSize, coat: CoatType) => {
    const field = capacityFieldName(species, size, coat);
    if (state.values) return state.values[field] ?? "";
    return (
      location.location_pet_capacity
        .find((c) => c.species === species && c.size === size && c.coat === coat)
        ?.pets_per_staff.toString() ?? ""
    );
  };
  const configured = (size: PetSize) =>
    SPECIES.flatMap((species) => COAT_TYPES.map((coat) => valueOf(species, size, coat))).filter(
      (value) => value !== "",
    ).length;

  return (
    <form action={action} className={matrixStyles.form} noValidate>
      <p className={matrixStyles.help}>
        ¿Cuántas mascotas atiende <strong>un empleado</strong> en un día? Por ejemplo, 4 grandes o 6
        medianos. Deja vacío lo que este local no recibe.
      </p>
      {PET_SIZES.map((size) => {
        const expanded = isDesktop || open.has(size) || sizesWithErrors.has(size);
        const panelId = `capacity-${size}`;
        return (
          <div key={size} className={cx(matrixStyles.size, expanded && matrixStyles.open)}>
            <button
              type="button"
              className={matrixStyles.toggle}
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
              <span className={matrixStyles.sizeName}>{sizeLabel[size]}</span>
              <span className={matrixStyles.summary}>
                {configured(size)} de {SPECIES.length * COAT_TYPES.length}
              </span>
              <ChevronDown aria-hidden="true" className={matrixStyles.chevron} />
            </button>
            <div id={panelId} className={matrixStyles.panel}>
              <div
                className={matrixStyles.grid}
                style={{ "--stages": SPECIES.length } as React.CSSProperties}
              >
                <span className={matrixStyles.corner}>Pelo</span>
                {SPECIES.map((species) => (
                  <span key={species} className={matrixStyles.colHeader}>
                    {speciesLabel[species]} (por día)
                  </span>
                ))}
                {COAT_TYPES.map((coat) => (
                  <div key={coat} className={matrixStyles.row}>
                    <span className={matrixStyles.rowHeader}>{coatLabel[coat]}</span>
                    {SPECIES.map((species) => {
                      const field = capacityFieldName(species, size, coat);
                      const error = state.fieldErrors?.[field];
                      return (
                        <span key={species} className={matrixStyles.cell}>
                          <input
                            name={field}
                            inputMode="numeric"
                            aria-label={`${speciesLabel[species]} · ${sizeLabel[size]} · ${coatLabel[coat]}`}
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? `${field}-error` : undefined}
                            defaultValue={valueOf(species, size, coat)}
                            key={`${field}-${state.values?.[field] ?? "saved"}`}
                            className={matrixStyles.input}
                          />
                          {error && (
                            <span id={`${field}-error`} className={matrixStyles.error}>
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
      <FormStatus state={state} />
      <Button type="submit" loading={pending}>
        Guardar capacidad
      </Button>
    </form>
  );
}
