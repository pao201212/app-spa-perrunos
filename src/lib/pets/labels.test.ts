import { describe, expect, it } from "vitest";

import { COAT_TYPES, coatLabel, PET_SIZES, sizeLabel, SPECIES, speciesLabel } from "./labels";

describe("etiquetas de mascotas (es-CO)", () => {
  it("cubre todas las especies, tallas y pelos de la BD", () => {
    expect(SPECIES).toEqual(["dog", "cat"]);
    expect(PET_SIZES).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
    expect(COAT_TYPES).toEqual(["short", "medium", "long"]);
  });

  it("traduce los valores", () => {
    expect(speciesLabel.dog).toBe("Perro");
    expect(sizeLabel.XS).toBe("Mini (XS)");
    expect(coatLabel.long).toBe("Largo");
  });
});
