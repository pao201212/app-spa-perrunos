import { describe, expect, it } from "vitest";

import { parsePriceMatrix, priceFieldName } from "./price-matrix";

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

// El servicio se ofrece en estas combinaciones (tienen duración).
const offered = [
  { size: "M", coat: "short" },
  { size: "M", coat: "long" },
] as const;

describe("parsePriceMatrix", () => {
  it("acepta la matriz completa para las combinaciones ofrecidas", () => {
    const result = parsePriceMatrix(
      "s",
      form({
        [priceFieldName("s", "M", "short")]: "45.000",
        [priceFieldName("s", "M", "long")]: "55000",
      }),
      offered,
    );
    expect(result).toEqual({
      rows: [
        { size: "M", coat: "short", price_cop: 45000 },
        { size: "M", coat: "long", price_cop: 55000 },
      ],
      errors: {},
    });
  });

  it("acepta la matriz vacía: no se ofrece en este local", () => {
    expect(parsePriceMatrix("s", form({}), offered)).toEqual({ rows: [], errors: {} });
  });

  it("una matriz a medias marca las combinaciones sin precio", () => {
    const result = parsePriceMatrix(
      "s",
      form({ [priceFieldName("s", "M", "short")]: "45000" }),
      offered,
    );
    expect(result.errors).toEqual({
      [priceFieldName("s", "M", "long")]:
        "Falta el precio: completa todas las combinaciones o deja todo vacío",
    });
  });

  it("no admite precios inválidos", () => {
    const result = parsePriceMatrix(
      "s",
      form({
        [priceFieldName("s", "M", "short")]: "abc",
        [priceFieldName("s", "M", "long")]: "-1",
      }),
      offered,
    );
    expect(Object.values(result.errors)).toEqual([
      "Escribe un precio en pesos",
      "Escribe un precio en pesos",
    ]);
  });

  it("ignora celdas de combinaciones que el servicio no ofrece", () => {
    const result = parsePriceMatrix(
      "s",
      form({
        [priceFieldName("s", "M", "short")]: "1",
        [priceFieldName("s", "M", "long")]: "2",
        [priceFieldName("s", "XL", "long")]: "99",
      }),
      offered,
    );
    expect(result.rows.map((r) => r.size + r.coat)).toEqual(["Mshort", "Mlong"]);
  });
});
