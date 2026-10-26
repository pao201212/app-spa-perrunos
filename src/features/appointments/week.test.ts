import { describe, expect, it } from "vitest";

import { canChangeStatus } from "./status";
import { parseDay, shortDay, weekOf } from "./week";

describe("semana de la agenda", () => {
  it("va de lunes a domingo, aunque el día sea domingo", () => {
    expect(weekOf("2026-11-04")).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(weekOf("2026-11-08")[0]).toBe("2026-11-02");
  });

  it("lee la fecha de la URL o usa hoy", () => {
    expect(parseDay("2026-11-04", "2026-11-02")).toBe("2026-11-04");
    expect(parseDay("ayer", "2026-11-02")).toBe("2026-11-02");
  });

  it("nombra el día corto en español", () => {
    expect(shortDay("2026-11-02")).toBe("lun 2 nov");
  });
});

describe("transiciones de estado", () => {
  it("avanza paso a paso; cancelar solo antes de atender", () => {
    expect(canChangeStatus("scheduled", "received")).toBe(true);
    expect(canChangeStatus("scheduled", "ready")).toBe(false);
    expect(canChangeStatus("in_progress", "cancelled")).toBe(false);
    expect(canChangeStatus("delivered", "scheduled")).toBe(false);
  });
});
