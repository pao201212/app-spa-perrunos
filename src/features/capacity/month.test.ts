import { describe, expect, it } from "vitest";

import { leadingBlanks, monthLabel, monthRange, parseMonth, shiftMonth } from "./month";

describe("meses del calendario de ocupación", () => {
  it("lee el mes de la URL o usa el de hoy", () => {
    expect(parseMonth("2026-12", "2026-11-02")).toBe("2026-12");
    expect(parseMonth("2026-13", "2026-11-02")).toBe("2026-11");
    expect(parseMonth(undefined, "2026-11-02")).toBe("2026-11");
  });

  it("calcula el rango, incluso en febrero bisiesto", () => {
    expect(monthRange("2026-11")).toEqual(["2026-11-01", "2026-11-30"]);
    expect(monthRange("2028-02")).toEqual(["2028-02-01", "2028-02-29"]);
  });

  it("se mueve entre meses cruzando el año", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("cuenta los huecos antes del día 1 (semana desde el lunes)", () => {
    expect(leadingBlanks("2026-11")).toBe(6); // 1 nov 2026 es domingo
    expect(leadingBlanks("2026-12")).toBe(1); // martes
  });

  it("nombra el mes en español", () => {
    expect(monthLabel("2026-11")).toBe("noviembre de 2026");
  });
});
