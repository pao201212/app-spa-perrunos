import { describe, expect, it } from "vitest";

import { durationFieldName, parseDurationMatrix, stagesFor } from "./duration-matrix";

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe("stagesFor", () => {
  it("devuelve las etapas de cada tipo de servicio", () => {
    expect(stagesFor("bath")).toEqual(["bath_min", "dry_min", "finish_min"]);
    expect(stagesFor("special_cut")).toEqual(["cut_min"]);
    expect(stagesFor("other")).toEqual(["finish_min"]);
  });
});

describe("parseDurationMatrix", () => {
  it("convierte las filas completas y omite las vacías (combinación no ofrecida)", () => {
    const result = parseDurationMatrix(
      "bath",
      form({
        [durationFieldName("M", "long", "bath_min")]: "40",
        [durationFieldName("M", "long", "dry_min")]: "30",
        [durationFieldName("M", "long", "finish_min")]: "20",
        [durationFieldName("S", "short", "bath_min")]: "",
      }),
    );
    expect(result.errors).toEqual({});
    expect(result.rows).toEqual([
      { size: "M", coat: "long", bath_min: 40, dry_min: 30, finish_min: 20 },
    ]);
  });

  it("marca las filas incompletas en el primer campo vacío", () => {
    const result = parseDurationMatrix(
      "bath",
      form({
        [durationFieldName("L", "medium", "bath_min")]: "50",
        [durationFieldName("L", "medium", "dry_min")]: "40",
      }),
    );
    expect(result.errors).toEqual({
      [durationFieldName("L", "medium", "finish_min")]:
        "Completa las tres etapas o deja la fila vacía",
    });
  });

  it("exige múltiplos de 5 entre 5 y 480", () => {
    const result = parseDurationMatrix(
      "special_cut",
      form({
        [durationFieldName("XS", "short", "cut_min")]: "33",
        [durationFieldName("S", "short", "cut_min")]: "500",
      }),
    );
    expect(result.errors).toEqual({
      [durationFieldName("XS", "short", "cut_min")]: "Usa múltiplos de 5",
      [durationFieldName("S", "short", "cut_min")]: "Máximo 480 min",
    });
  });

  it("ignora etapas que no aplican al tipo de servicio", () => {
    const result = parseDurationMatrix(
      "other",
      form({
        [durationFieldName("M", "short", "finish_min")]: "15",
        [durationFieldName("M", "short", "bath_min")]: "40",
      }),
    );
    expect(result.rows).toEqual([{ size: "M", coat: "short", finish_min: 15 }]);
  });
});
