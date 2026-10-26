import { describe, expect, it } from "vitest";

import { categorySchema, extraSchema, serviceSchema } from "./schema";

describe("serviceSchema", () => {
  it("acepta un servicio y normaliza campos opcionales", () => {
    expect(
      serviceSchema.parse({
        name: " Baño ",
        kind: "bath",
        species: "both",
        category_id: "",
        description: " ",
        is_active: "on",
      }),
    ).toEqual({
      name: "Baño",
      kind: "bath",
      species: "both",
      category_id: null,
      description: null,
      is_active: true,
    });
  });

  it("rechaza tipos y especies desconocidos", () => {
    const result = serviceSchema.safeParse({ name: "Servicio X", kind: "spa", species: "bird" });
    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual(["kind", "species"]);
  });
});

describe("categorySchema", () => {
  it("exige un nombre", () => {
    expect(categorySchema.parse({ name: " Estilo " })).toEqual({ name: "Estilo" });
    expect(categorySchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("extraSchema", () => {
  it("acepta minutos en múltiplos de 5 (o vacío = 0)", () => {
    expect(extraSchema.parse({ name: "Cepillado", extra_minutes: "10" })).toEqual({
      name: "Cepillado",
      extra_minutes: 10,
    });
    expect(extraSchema.parse({ name: "Perfume", extra_minutes: "" }).extra_minutes).toBe(0);
    expect(extraSchema.safeParse({ name: "Raro", extra_minutes: "7" }).success).toBe(false);
  });
});
