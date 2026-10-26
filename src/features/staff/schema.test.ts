import { describe, expect, it } from "vitest";

import { absenceSchema, shiftSchema, staffSchema } from "./schema";

describe("staffSchema", () => {
  it("exige nombre y al menos una habilidad", () => {
    expect(staffSchema.parse({ name: " Ana ", skills: ["bath", "dry"], is_active: "on" })).toEqual({
      name: "Ana",
      skills: ["bath", "dry"],
      is_active: true,
    });
    const result = staffSchema.safeParse({ name: "", skills: [] });
    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual(["name", "skills"]);
  });
});

describe("shiftSchema", () => {
  const valid = {
    location_id: "6f1c7a2e-1d2b-4c3d-8e9f-0a1b2c3d4e5f",
    weekday: "6",
    starts_at: "08:00",
    ends_at: "13:00",
  };

  it("acepta un turno válido", () => {
    expect(shiftSchema.parse(valid)).toEqual({ ...valid, weekday: 6 });
  });

  it("rechaza un fin anterior al inicio y un local inválido", () => {
    expect(shiftSchema.safeParse({ ...valid, ends_at: "07:00" }).error?.issues[0].path).toEqual([
      "ends_at",
    ]);
    expect(shiftSchema.safeParse({ ...valid, location_id: "x" }).success).toBe(false);
  });
});

describe("absenceSchema", () => {
  it("acepta un rango en hora local y rechaza uno invertido", () => {
    expect(
      absenceSchema.parse({
        starts_at: "2026-12-24T08:00",
        ends_at: "2026-12-26T18:00",
        reason: "",
      }),
    ).toEqual({ starts_at: "2026-12-24T08:00", ends_at: "2026-12-26T18:00", reason: null });
    const result = absenceSchema.safeParse({
      starts_at: "2026-12-26T08:00",
      ends_at: "2026-12-24T08:00",
    });
    expect(result.error?.issues[0].path).toEqual(["ends_at"]);
  });
});
