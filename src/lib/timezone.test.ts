import { describe, expect, it } from "vitest";

import {
  formatInZone,
  timeInZone,
  todayInZone,
  utcToZonedInput,
  zonedInputToUtc,
} from "./timezone";

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

describe("todayInZone y timeInZone", () => {
  it("usa la fecha y la hora del spa, no la del servidor", () => {
    const lateNight = new Date("2026-11-03T03:30:00Z"); // 22:30 del 2 nov en Bogotá
    expect(todayInZone("America/Bogota", lateNight)).toBe("2026-11-02");
    expect(timeInZone("2026-11-03T03:30:00Z", "America/Bogota")).toBe("22:30");
  });
});
