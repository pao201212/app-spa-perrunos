"use client";

import { useActionState, useState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input, Select } from "@/components/ui";

import { saveServiceAction } from "../actions";
import type { Category, ServiceDetail } from "../queries";
import {
  kindDescription,
  kindLabel,
  SERVICE_KINDS,
  SERVICE_SPECIES,
  serviceSpeciesLabel,
  type ServiceKind,
} from "../schema";
import styles from "./services.module.css";

type Props = { slug: string; categories: Category[]; service?: ServiceDetail };

export function ServiceForm({ slug, categories, service }: Props) {
  const [state, action, pending] = useActionState(
    saveServiceAction.bind(null, slug, service?.id ?? null),
    initialFormState,
  );
  const [kind, setKind] = useState<ServiceKind>(service?.kind ?? "bath");
  const value = (field: string, fallback?: string | null) =>
    state.values?.[field] ?? fallback ?? "";

  return (
    <form action={action} className={formStyles.form} noValidate>
      <Input
        label="Nombre del servicio"
        name="name"
        required
        defaultValue={value("name", service?.name)}
        error={state.fieldErrors?.name}
      />
      <div className={styles.grid2}>
        <Select
          label="Tipo"
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as ServiceKind)}
          disabled={!!service}
          hint={kindDescription[kind]}
          error={state.fieldErrors?.kind}
        >
          {SERVICE_KINDS.map((k) => (
            <option key={k} value={k}>
              {kindLabel[k]}
            </option>
          ))}
        </Select>
        <Select
          label="Para"
          name="species"
          defaultValue={value("species", service?.species ?? "both")}
          error={state.fieldErrors?.species}
        >
          {SERVICE_SPECIES.map((species) => (
            <option key={species} value={species}>
              {serviceSpeciesLabel[species]}
            </option>
          ))}
        </Select>
        <Select
          label="Categoría"
          name="category_id"
          defaultValue={value("category_id", service?.category_id)}
        >
          <option value="">Sin categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
      {service && <input type="hidden" name="kind" value={service.kind} />}
      <Input
        label="Descripción (opcional)"
        name="description"
        defaultValue={value("description", service?.description)}
        hint="La verán los clientes en el catálogo."
      />
      {service && (
        <label className={styles.checkbox}>
          <input type="checkbox" name="is_active" defaultChecked={service.is_active} />
          Activo (visible para reservar)
        </label>
      )}
      <FormStatus state={state} />
      <Button type="submit" loading={pending}>
        {service ? "Guardar servicio" : "Crear servicio"}
      </Button>
    </form>
  );
}
