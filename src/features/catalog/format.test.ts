import { describe, expect, it } from "vitest";

import { summarizeHours, whatsappLink } from "./format";

const range = (weekday: number, opens_at: string, closes_at: string) => ({
  weekday,
  opens_at,
  closes_at,
});

describe("summarizeHours", () => {
  it("agrupa días consecutivos con el mismo horario, empezando el lunes", () => {
    const hours = [1, 2, 3, 4, 5].flatMap((d) => [
      range(d, "08:00:00", "12:30:00"),
      range(d, "13:00:00", "18:00:00"),
    ]);
    hours.push(range(6, "08:00:00", "13:00:00"));
    expect(summarizeHours(hours)).toEqual([
      { days: "Lunes a viernes", hours: "08:00–12:30 · 13:00–18:00" },
      { days: "Sábado", hours: "08:00–13:00" },
      { days: "Domingo", hours: "Cerrado" },
    ]);
  });

  it("usa 'y' para dos días y separa grupos no consecutivos", () => {
    const hours = [
      range(1, "09:00:00", "17:00:00"),
      range(2, "09:00:00", "17:00:00"),
      range(4, "09:00:00", "17:00:00"),
    ];
    expect(summarizeHours(hours)).toEqual([
      { days: "Lunes y martes", hours: "09:00–17:00" },
      { days: "Miércoles", hours: "Cerrado" },
      { days: "Jueves", hours: "09:00–17:00" },
      { days: "Viernes a domingo", hours: "Cerrado" },
    ]);
  });

  it("sin horario: todos los días cerrado", () => {
    expect(summarizeHours([])).toEqual([{ days: "Lunes a domingo", hours: "Cerrado" }]);
  });
});

describe("whatsappLink", () => {
  it("arma el enlace wa.me solo con dígitos", () => {
    expect(whatsappLink("+57 300 123-4567")).toBe("https://wa.me/573001234567");
  });

  it("devuelve null si no hay número", () => {
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink("  ")).toBeNull();
  });
});
