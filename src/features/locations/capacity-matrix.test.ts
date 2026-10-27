import { describe, expect, it } from "vitest";

import { capacityFieldName, parseCapacityMatrix } from "./capacity-matrix";

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe("parseCapacityMatrix", () => {
  it("lee las celdas llenas e ignora las vacías", () => {
    const { rows, errors } = parseCapacityMatrix(
      form({
        [capacityFieldName("dog", "L", "short")]: "4",
        [capacityFieldName("dog", "M", "short")]: " 6 ",
        [capacityFieldName("cat", "S", "long")]: "",
      }),
    );
    expect(errors).toEqual({});
    expect(rows).toEqual([
      { species: "dog", size: "M", coat: "short", pets_per_staff: 6 },
      { species: "dog", size: "L", coat: "short", pets_per_staff: 4 },
    ]);
  });

  it("marca valores que no son enteros entre 1 y 100", () => {
    const fields = {
      zero: capacityFieldName("dog", "S", "short"),
      decimal: capacityFieldName("dog", "S", "medium"),
      text: capacityFieldName("cat", "M", "short"),
      many: capacityFieldName("cat", "L", "long"),
    };
    const { rows, errors } = parseCapacityMatrix(
      form({
        [fields.zero]: "0",
        [fields.decimal]: "2.5",
        [fields.text]: "seis",
        [fields.many]: "101",
      }),
    );
    expect(rows).toEqual([]);
    expect(errors).toEqual({
      [fields.zero]: "Escribe un número entero (mínimo 1)",
      [fields.decimal]: "Escribe un número entero (mínimo 1)",
      [fields.text]: "Escribe un número entero (mínimo 1)",
      [fields.many]: "Máximo 100",
    });
  });
});
