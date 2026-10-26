import { COAT_TYPES, PET_SIZES, type CoatType, type PetSize } from "@/lib/pets/labels";

import type { ServiceKind } from "./schema";

export type Stage = "bath_min" | "dry_min" | "finish_min" | "cut_min";

const STAGES_BY_KIND: Record<ServiceKind, Stage[]> = {
  bath: ["bath_min", "dry_min", "finish_min"],
  special_cut: ["cut_min"],
  other: ["finish_min"],
};

export const stageLabel: Record<Stage, string> = {
  bath_min: "Baño",
  dry_min: "Secado",
  finish_min: "Terminado",
  cut_min: "Corte",
};

export const stagesFor = (kind: ServiceKind): Stage[] => STAGES_BY_KIND[kind];

/** Nombre del campo del formulario para una celda de la matriz. */
export const durationFieldName = (size: PetSize, coat: CoatType, stage: Stage) =>
  `d.${size}.${coat}.${stage}`;

export type DurationRow = { size: PetSize; coat: CoatType } & Partial<Record<Stage, number>>;

/**
 * Lee la matriz talla × pelo del formulario. Una fila vacía significa que esa combinación no se
 * ofrece; una fila a medias es un error. Los minutos van de 5 a 480 en múltiplos de 5.
 */
export function parseDurationMatrix(kind: ServiceKind, formData: FormData) {
  const stages = stagesFor(kind);
  const rows: DurationRow[] = [];
  const errors: Record<string, string> = {};

  for (const size of PET_SIZES) {
    for (const coat of COAT_TYPES) {
      const raw = stages.map((stage) =>
        String(formData.get(durationFieldName(size, coat, stage)) ?? "").trim(),
      );
      if (raw.every((value) => value === "")) continue;

      const row: DurationRow = { size, coat };
      let valid = true;
      stages.forEach((stage, index) => {
        const field = durationFieldName(size, coat, stage);
        const minutes = Number(raw[index]);
        if (raw[index] === "") {
          if (valid) errors[field] = "Completa las tres etapas o deja la fila vacía";
          valid = false;
        } else if (!Number.isInteger(minutes) || minutes < 5) {
          errors[field] = "Escribe minutos (mínimo 5)";
          valid = false;
        } else if (minutes > 480) {
          errors[field] = "Máximo 480 min";
          valid = false;
        } else if (minutes % 5 !== 0) {
          errors[field] = "Usa múltiplos de 5";
          valid = false;
        } else {
          row[stage] = minutes;
        }
      });
      if (valid) rows.push(row);
    }
  }
  return { rows, errors };
}
