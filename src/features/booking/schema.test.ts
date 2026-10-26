import { describe, expect, it } from "vitest";

import { bookingErrorMessage, bookRequestSchema, isSlotTaken } from "./schema";

const ID = "6f1c2a59-2a7f-4f63-9a59-0d1c0f0e8b11";

describe("bookRequestSchema", () => {
  const valid = {
    locationId: ID,
    startsAt: "2026-11-02T13:00:00.000Z",
    selections: [{ petId: ID, serviceId: ID, cutId: null, extras: [], options: [] }],
  };

  it("acepta una reserva completa", () => {
    expect(bookRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("exige al menos una mascota con servicio", () => {
    expect(bookRequestSchema.safeParse({ ...valid, selections: [] }).success).toBe(false);
    expect(
      bookRequestSchema.safeParse({
        ...valid,
        selections: [{ ...valid.selections[0], serviceId: null }],
      }).success,
    ).toBe(false);
  });
});

describe("mensajes de error de la reserva", () => {
  it("un cupo recién tomado pide elegir otra hora", () => {
    expect(bookingErrorMessage("CUPO_LLENO", "x")).toBe(
      "Ese horario acaba de ocuparse. Elige otra hora.",
    );
    expect(isSlotTaken("SIN_ESPACIO")).toBe(true);
  });

  it("una hora pasada o un error desconocido tienen su propio mensaje", () => {
    expect(bookingErrorMessage("PASADO", "x")).toBe("Ese horario ya pasó. Elige otra hora.");
    expect(isSlotTaken("PASADO")).toBe(true);
    expect(bookingErrorMessage(undefined, "x")).toBe(
      "No pudimos reservar ese horario. Elige otra hora o intenta de nuevo.",
    );
  });

  it("los límites usan el mensaje del servidor", () => {
    expect(bookingErrorMessage("LIMITE_RESERVAS", "Ya tienes 10 citas activas")).toBe(
      "Ya tienes 10 citas activas",
    );
    expect(isSlotTaken("LIMITE_RESERVAS")).toBe(false);
  });
});
