import { describe, expect, it } from "vitest";

import { breedFormSchema } from "./schema";

const valid = {
  species: "dog",
  name: " Golden Retriever ",
  default_size: "L",
  default_coat: "long",
};

describe("breedFormSchema", () => {
  it("acepta una raza válida, recorta el nombre y lee el checkbox de criollo", () => {
    expect(breedFormSchema.parse({ ...valid, is_mixed: "on" })).toEqual({
      species: "dog",
      name: "Golden Retriever",
      default_size: "L",
      default_coat: "long",
      is_mixed: true,
    });
    expect(breedFormSchema.parse(valid).is_mixed).toBe(false);
  });

  it.each([
    ["especie", { species: "bird" }, "species"],
    ["nombre vacío", { name: "  " }, "name"],
    ["talla", { default_size: "XXXL" }, "default_size"],
    ["pelo", { default_coat: "rizado" }, "default_coat"],
  ])("rechaza %s inválido", (_, override, field) => {
    const result = breedFormSchema.safeParse({ ...valid, ...override });
    expect(result.error?.issues.map((i) => i.path[0])).toContain(field);
  });
});
