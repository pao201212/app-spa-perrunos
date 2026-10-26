import { describe, expect, it } from "vitest";

import { formatFraction, reasonMessage } from "./reasons";

const TZ = "America/Bogota";

describe("formatFraction", () => {
  it.each([
    [{ num: 1, den: 6 }, "⅙"],
    [{ num: 3, den: 2 }, "1½"],
    [{ num: 2, den: 1 }, "2"],
    [{ num: 0, den: 1 }, "0"],
    [{ num: 1, den: 7 }, "1/7"],
    [{ num: 9, den: 7 }, "1 2/7"],
  ])("%o → %s", (fraction, text) => {
    expect(formatFraction(fraction)).toBe(text);
  });
});

describe("reasonMessage", () => {
  it.each([
    ["PASADO", null, "Este horario ya pasó"],
    ["CERRADO", { reason: "Navidad" }, "El local cierra este día (Navidad)"],
    ["CERRADO", { reason: null }, "El local no abre este día"],
    [
      "MUY_LEJOS",
      { max_date: "2026-11-25" },
      "Solo se reserva hasta el miércoles, 25 de noviembre de 2026",
    ],
    [
      "SIN_PRECIO",
      { pet: 1, service: "Baño" },
      "Baño no tiene precio en este local para esa talla y pelo",
    ],
    [
      "SIN_CAPACIDAD",
      { species: "cat", size: "XXL", coat: "long" },
      "Gato Gigante (XXL) de pelo largo no se atiende en este local",
    ],
    [
      "CUPO_LLENO",
      { jornadas: { num: 2, den: 1 }, remaining: { num: 1, den: 6 }, needed: { num: 1, den: 3 } },
      "Quedan ⅙ de jornada y se necesita ⅓",
    ],
    [
      "CUPO_LLENO",
      { jornadas: { num: 3, den: 2 }, remaining: { num: 0, den: 1 }, needed: { num: 1, den: 4 } },
      "Día lleno: no queda cupo en 1½ jornadas",
    ],
    [
      "SIN_ESPACIO",
      { at: "2026-11-02T15:00:00+00:00", present: 6, max: 6 },
      "A las 10:00 ya hay 6 mascotas (máximo 6)",
    ],
    [
      "FUERA_DE_HORARIO",
      { ready_at: "2026-11-02T22:15:00+00:00", closes_at: "2026-11-02T22:00:00+00:00" },
      "Entregaría 17:15 y el local cierra 17:00",
    ],
  ] as const)("%s %o", (code, detail, text) => {
    expect(reasonMessage(code, detail, TZ)).toBe(text);
  });
});

describe("reasonMessage sin detalle", () => {
  it.each([
    ["MUY_LEJOS", "Fecha muy lejana"],
    ["SIN_PRECIO", "Este servicio no tiene precio en este local para esa talla y pelo"],
    [
      "SIN_DURACION",
      "Este servicio no tiene duración para esa talla y pelo (Servicios → Duraciones)",
    ],
    ["SIN_EMPLEADOS", "Ese día nadie que bañe tiene turno en este local (Personal → Turnos)"],
    ["SIN_CAPACIDAD", "Esa combinación no se atiende en este local"],
    ["CUPO_LLENO", "No queda cupo ese día"],
    ["SIN_ESPACIO", "El local está lleno a esa hora"],
    ["FUERA_DE_HORARIO", "Terminaría después del cierre"],
  ] as const)("%s", (code, text) => {
    expect(reasonMessage(code, null, TZ)).toBe(text);
  });

  it("nombra el adicional sin precio y la duración faltante", () => {
    expect(reasonMessage("SIN_PRECIO", { extra: "Hidratación" }, TZ)).toBe(
      "Hidratación no tiene precio en este local para esa talla y pelo",
    );
    expect(reasonMessage("SIN_DURACION", { service: "Baño" }, TZ)).toBe(
      "Baño no tiene duración para esa talla y pelo (Servicios → Duraciones)",
    );
  });

  it("con una jornada usada habla en singular", () => {
    expect(
      reasonMessage(
        "CUPO_LLENO",
        { jornadas: { num: 1, den: 1 }, remaining: { num: 0, den: 1 }, needed: { num: 1, den: 6 } },
        TZ,
      ),
    ).toBe("Día lleno: no queda cupo en 1 jornada");
  });
});
