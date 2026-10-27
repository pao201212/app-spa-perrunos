import { describe, expect, it } from "vitest";

import { canConfirmReception, isActive } from "./status";

describe("estados de la cita", () => {
  it("activas hasta que se entregan, cancelan o no asisten", () => {
    expect(isActive("scheduled")).toBe(true);
    expect(isActive("ready")).toBe(true);
    expect(isActive("delivered")).toBe(false);
    expect(isActive("cancelled")).toBe(false);
  });

  it("la recepción se confirma una vez, después de que el spa recibe a la mascota", () => {
    expect(canConfirmReception("scheduled", null)).toBe(false);
    expect(canConfirmReception("received", null)).toBe(true);
    expect(canConfirmReception("received", "2026-11-02T13:00:00Z")).toBe(false);
  });
});
