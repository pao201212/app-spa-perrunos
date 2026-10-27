import { describe, expect, it } from "vitest";

import { makeThresholdsSchema, ownBreedSchema, tenantBreedEditSchema } from "./schema";

describe("makeThresholdsSchema", () => {
  const dog = makeThresholdsSchema(["XS", "S", "M"]);

  it("convierte los pesos y acepta decimales", () => {
    expect(dog.parse({ XS: "5", S: "10,5", M: "20" })).toEqual({ XS: 5, S: 10.5, M: 20 });
  });

  it("exige pesos crecientes y señala la talla que rompe el orden", () => {
    const result = dog.safeParse({ XS: "5", S: "4", M: "20" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["S"]);
    expect(result.error?.issues[0].message).toMatch(/mayor que 5/);
  });

  it("rechaza pesos vacíos, cero o negativos", () => {
    expect(dog.safeParse({ XS: "", S: "10", M: "20" }).success).toBe(false);
    expect(dog.safeParse({ XS: "0", S: "10", M: "20" }).success).toBe(false);
  });
});

describe("ownBreedSchema", () => {
  it("acepta una raza propia", () => {
    expect(
      ownBreedSchema.parse({ species: "dog", name: " Abbey Refugio ", size: "M", coat: "short" }),
    ).toEqual({
      species: "dog",
      name: "Abbey Refugio",
      size: "M",
      coat: "short",
    });
  });
});

describe("tenantBreedEditSchema", () => {
  it("lee el checkbox de visibilidad", () => {
    expect(tenantBreedEditSchema.parse({ size: "L", coat: "long", is_active: "on" })).toEqual({
      size: "L",
      coat: "long",
      is_active: true,
    });
    expect(tenantBreedEditSchema.parse({ size: "L", coat: "long" }).is_active).toBe(false);
  });
});
