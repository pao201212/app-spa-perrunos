"use client";

import { useActionState, useId, useRef, useState, type ReactNode } from "react";

import { initialFormState } from "@/components/forms/form-state";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button } from "@/components/ui";
import { COAT_TYPES, coatLabel, PET_SIZES, sizeLabel } from "@/lib/pets/labels";

import { savePricesAction } from "../actions";
import { priceFieldName, type Combo } from "../price-matrix";
import type { LocationPrices } from "../queries";
import styles from "./prices.module.css";

/** "38000" → "38.000" (el parser acepta ambos formatos). */
const thousands = new Intl.NumberFormat("es-CO");

type Props = {
  slug: string;
  serviceId: string;
  serviceName: string;
  locationId: string;
  offered: Combo[];
  extras: { id: string; name: string }[];
  prices: LocationPrices;
};

export function PriceMatrixForm({
  slug,
  serviceId,
  serviceName,
  locationId,
  offered,
  extras,
  prices,
}: Props) {
  const [state, action, pending] = useActionState(
    savePricesAction.bind(null, slug, serviceId, locationId),
    initialFormState,
  );

  const savedValue = (item: string, size: string, coat: string) => {
    const row =
      item === "s"
        ? prices.service.find((p) => p.size === size && p.coat === coat)
        : prices.extras.find((p) => p.extra_id === item && p.size === size && p.coat === coat);
    return row ? thousands.format(row.price_cop) : "";
  };

  const matrix = (item: string) => (
    <PriceGrid
      item={item}
      offered={offered}
      valueOf={(size, coat) =>
        state.values?.[priceFieldName(item, size, coat)] ?? savedValue(item, size, coat)
      }
      errorOf={(size, coat) => state.fieldErrors?.[priceFieldName(item, size, coat)]}
      version={state.values ? JSON.stringify(state.values).length : 0}
    />
  );

  return (
    <form action={action} className={styles.form} noValidate>
      <PriceSection title={serviceName}>{matrix("s")}</PriceSection>
      {extras.map((extra) => (
        <PriceSection key={extra.id} title={`Extra: ${extra.name}`}>
          {matrix(extra.id)}
        </PriceSection>
      ))}
      <FormStatus state={state} />
      <Button type="submit" loading={pending}>
        Guardar precios
      </Button>
    </form>
  );
}

/** Sección con nombre accesible y la opción de llenar todas las celdas con un mismo precio. */
function PriceSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  const fillId = useId();
  const container = useRef<HTMLElement>(null);
  const [fill, setFill] = useState("");

  function applyToAll() {
    container.current?.querySelectorAll<HTMLInputElement>("input[data-price]").forEach((input) => {
      input.value = fill;
    });
  }

  return (
    <section ref={container} aria-labelledby={headingId} className={styles.section}>
      <h3 id={headingId} className={styles.sectionTitle}>
        {title}
      </h3>
      {children}
      <div className={styles.fill}>
        <label htmlFor={fillId} className={styles.fillLabel}>
          Precio para todas
        </label>
        <input
          id={fillId}
          inputMode="numeric"
          value={fill}
          onChange={(event) => setFill(event.target.value)}
          className={styles.input}
          placeholder="Ej. 45.000"
        />
        <Button variant="ghost" onClick={applyToAll} disabled={fill.trim() === ""}>
          Aplicar a todas
        </Button>
      </div>
    </section>
  );
}

type GridProps = {
  item: string;
  offered: Combo[];
  valueOf: (size: Combo["size"], coat: Combo["coat"]) => string;
  errorOf: (size: Combo["size"], coat: Combo["coat"]) => string | undefined;
  version: number;
};

function PriceGrid({ item, offered, valueOf, errorOf, version }: GridProps) {
  const sizes = PET_SIZES.filter((size) => offered.some((combo) => combo.size === size));
  const isOffered = (size: string, coat: string) =>
    offered.some((c) => c.size === size && c.coat === coat);

  return (
    <div className={styles.grid}>
      <span className={styles.header}>Talla</span>
      {COAT_TYPES.map((coat) => (
        <span key={coat} className={styles.header}>
          {coatLabel[coat]}
        </span>
      ))}
      {sizes.map((size) => (
        <div key={size} className={styles.row}>
          <span className={styles.rowHeader}>{sizeLabel[size]}</span>
          {COAT_TYPES.map((coat) => {
            if (!isOffered(size, coat)) {
              return (
                <span key={coat} className={styles.na}>
                  <span aria-hidden="true">—</span>
                  <span className="visually-hidden">No se ofrece</span>
                </span>
              );
            }
            const field = priceFieldName(item, size, coat);
            const error = errorOf(size, coat);
            return (
              <span key={coat} className={styles.cell}>
                <input
                  data-price
                  name={field}
                  inputMode="numeric"
                  aria-label={`${sizeLabel[size]} · ${coatLabel[coat]}`}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${field}-error` : undefined}
                  defaultValue={valueOf(size, coat)}
                  key={`${field}-${version}`}
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
  );
}
