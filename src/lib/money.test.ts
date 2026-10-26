import { describe, expect, it } from "vitest";

import { formatCop, parseCop } from "./money";

describe("parseCop", () => {
  it.each([
    ["55000", 55000],
    ["55.000", 55000],
    ["$ 55.000", 55000],
    ["55,000", 55000],
    [" 1.250.000 ", 1250000],
    ["0", 0],
  ])("%s → %d", (input, expected) => {
    expect(parseCop(input)).toBe(expected);
  });

  it.each(["", "abc", "-5000", "55.5"])("rechaza %s", (input) => {
    expect(parseCop(input)).toBeNull();
  });
});

describe("formatCop", () => {
  it("formatea pesos colombianos sin decimales", () => {
    expect(formatCop(55000).replace(/\s/g, " ")).toBe("$ 55.000");
  });
});
