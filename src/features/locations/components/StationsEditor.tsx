"use client";

import { useActionState, useState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Badge, Button, Input, Select } from "@/components/ui";

import { removeStationAction, saveStationAction } from "../actions";
import type { LocationDetail } from "../queries";
import { STATION_KINDS, stationKindLabel, type StationKind } from "../schema";
import styles from "./locations.module.css";

type Station = LocationDetail["stations"][number];

/** Tinas y mesas del local, una por una (D27). */
export function StationsEditor({ slug, location }: { slug: string; location: LocationDetail }) {
  const stations = [...location.stations].sort(
    (a, b) =>
      STATION_KINDS.indexOf(a.kind) - STATION_KINDS.indexOf(b.kind) ||
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name, "es", { numeric: true }),
  );

  return (
    <div className={styles.editor}>
      {stations.length === 0 ? (
        <p className={styles.muted}>
          Aún no hay estaciones. Agrega las tinas y las mesas de este local.
        </p>
      ) : (
        <ul className={styles.list}>
          {stations.map((station) => (
            <StationRow key={station.id} slug={slug} locationId={location.id} station={station} />
          ))}
        </ul>
      )}
      <StationForm slug={slug} locationId={location.id} station={null} count={stations.length} />
    </div>
  );
}

function StationRow({
  slug,
  locationId,
  station,
}: {
  slug: string;
  locationId: string;
  station: Station;
}) {
  const [editing, setEditing] = useState(false);
  const panelId = `station-${station.id}`;

  return (
    <li className={styles.stationItem}>
      <div className={styles.row}>
        <strong className={styles.grow}>{station.name}</strong>
        <span className={styles.chips}>
          <Badge tone="neutral">{station.kind === "tub" ? "Baño" : "Secado y detalles"}</Badge>
          {station.for_special_cut && <Badge tone="primary">Corte especial</Badge>}
        </span>
        <Button
          type="button"
          variant="ghost"
          aria-expanded={editing}
          aria-controls={panelId}
          onClick={() => setEditing((open) => !open)}
        >
          {editing ? "Cerrar" : "Editar"}
          <span className="visually-hidden"> {station.name}</span>
        </Button>
        <form action={removeStationAction.bind(null, slug, locationId, station.id)}>
          <Button type="submit" variant="ghost">
            Quitar<span className="visually-hidden"> {station.name}</span>
          </Button>
        </form>
      </div>
      <div id={panelId} hidden={!editing} className={styles.stationPanel}>
        {editing && <StationForm slug={slug} locationId={locationId} station={station} count={0} />}
      </div>
    </li>
  );
}

function StationForm({
  slug,
  locationId,
  station,
  count,
}: {
  slug: string;
  locationId: string;
  station: Station | null;
  /** Cambia al agregar o quitar estaciones: limpia los campos. */
  count: number;
}) {
  const [state, action, pending] = useActionState(
    saveStationAction.bind(null, slug, locationId, station?.id ?? null),
    initialFormState,
  );
  // React reinicia el formulario tras el envío: los valores vuelven del servidor.
  const failed = state.status === "error";
  const values = state.values ?? {};
  const defaults = {
    name: failed ? values.name : (station?.name ?? ""),
    kind: (values.kind as StationKind) || station?.kind || "table",
    cut: values.kind ? values.for_special_cut === "on" : (station?.for_special_cut ?? false),
  };

  return (
    <form action={action} className={formStyles.form} noValidate>
      <StationFields
        key={`${count}-${state.status}-${defaults.kind}-${defaults.cut}`}
        defaults={defaults}
        errors={state.fieldErrors}
      />
      <FormStatus state={state} />
      <Button type="submit" variant={station ? "primary" : "ghost"} loading={pending}>
        {station ? "Guardar estación" : "Agregar estación"}
      </Button>
    </form>
  );
}

function StationFields({
  defaults,
  errors,
}: {
  defaults: { name?: string; kind: StationKind; cut: boolean };
  errors?: Partial<Record<string, string>>;
}) {
  const [kind, setKind] = useState<StationKind>(defaults.kind);

  return (
    <>
      <div className={styles.grid2}>
        <Input
          label="Nombre"
          name="name"
          hint="Si lo dejas vacío, se numera solo (Tina 3, Mesa 4…)."
          defaultValue={defaults.name}
          error={errors?.name}
        />
        <Select
          label="Tipo"
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as StationKind)}
          error={errors?.kind}
        >
          {STATION_KINDS.map((option) => (
            <option key={option} value={option}>
              {stationKindLabel[option]} · {option === "tub" ? "baño" : "secado y detalles"}
            </option>
          ))}
        </Select>
      </div>
      {kind === "table" && (
        <label className={styles.checkbox}>
          <input type="checkbox" name="for_special_cut" defaultChecked={defaults.cut} />
          También sirve para corte especial
        </label>
      )}
    </>
  );
}
