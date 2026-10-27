import { describe, expect, it } from "vitest";

import { contrastRatio, parseHexColor } from "./contrast";

describe("parseHexColor", () => {
  it("acepta #rgb y #rrggbb", () => {
    expect(parseHexColor("#fff")).toEqual([255, 255, 255]);
    expect(parseHexColor("#2744C8")).toEqual([39, 68, 200]);
  });

  it("devuelve null si no es hex", () => {
    expect(parseHexColor("rgb(0 0 0)")).toBeNull();
    expect(parseHexColor("#12")).toBeNull();
  });
});

describe("contrastRatio (WCAG 2.x)", () => {
  it("negro sobre blanco es 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("es simétrico", () => {
    expect(contrastRatio("#4daaf8", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#4daaf8"), 5);
  });

  it("el azul claro del logo con texto blanco no alcanza AA (por eso existe --color-primary-strong)", () => {
    expect(contrastRatio("#ffffff", "#4daaf8")).toBeLessThan(4.5);
    expect(contrastRatio("#ffffff", "#2744c8")).toBeGreaterThanOrEqual(4.5);
  });
});
