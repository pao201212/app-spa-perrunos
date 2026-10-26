import { describe, expect, it } from "vitest";

import { formatInZone, utcToZonedInput, zonedInputToUtc } from "./timezone";

describe("conversión entre hora local del spa y UTC", () => {
  it("convierte un datetime-local de Bogotá (UTC-5) a UTC", () => {
    expect(zonedInputToUtc("2026-12-24T08:00", "America/Bogota")).toBe("2026-12-24T13:00:00.000Z");
  });

  it("y de vuelta al valor de un input datetime-local", () => {
    expect(utcToZonedInput("2026-12-24T13:00:00.000Z", "America/Bogota")).toBe("2026-12-24T08:00");
  });

  it("respeta otras zonas, incluido el cambio de horario", () => {
    expect(zonedInputToUtc("2026-07-01T10:00", "Europe/Madrid")).toBe("2026-07-01T08:00:00.000Z");
    expect(zonedInputToUtc("2026-12-01T10:00", "Europe/Madrid")).toBe("2026-12-01T09:00:00.000Z");
  });

  it("rechaza valores mal formados", () => {
    expect(() => zonedInputToUtc("24/12/2026 8am", "America/Bogota")).toThrow();
  });

  it("formatea en español en la zona del spa", () => {
    expect(formatInZone("2026-12-24T13:00:00.000Z", "America/Bogota")).toBe(
      "jue 24 dic 2026, 08:00",
    );
  });
});
