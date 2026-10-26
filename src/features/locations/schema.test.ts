import { describe, expect, it } from "vitest";

import {
  applySectionsSchema,
  bookingSettingsSchema,
  closureSchema,
  hourRangeSchema,
  locationDetailsSchema,
  stationsSchema,
} from "./schema";

describe("locationDetailsSchema", () => {
  it("recorta textos y vuelve null los opcionales vacíos", () => {
    expect(
      locationDetailsSchema.parse({
        name: " Sede Norte ",
        address: "",
        whatsapp: " +57 300 123 4567 ",
      }),
    ).toEqual({
      name: "Sede Norte",
      address: null,
      whatsapp: "+57 300 123 4567",
      is_active: false,
    });
  });

  it("exige nombre y un WhatsApp con formato de teléfono", () => {
    const result = locationDetailsSchema.safeParse({ name: "", whatsapp: "abc" });
    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual(["name", "whatsapp"]);
  });
});

describe("bookingSettingsSchema", () => {
  const valid = {
    confirmation_mode: "auto",
    cancel_window_hours: "4",
    max_days_ahead: "30",
    slot_step_min: "15",
    bather_continues_drying: "on",
  };

  it("convierte los números del formulario", () => {
    expect(bookingSettingsSchema.parse(valid)).toEqual({
      confirmation_mode: "auto",
      cancel_window_hours: 4,
      max_days_ahead: 30,
      slot_step_min: 15,
      bather_continues_drying: true,
    });
  });

  it.each([
    ["horas de cancelación negativas", { cancel_window_hours: "-1" }],
    ["0 días de reserva", { max_days_ahead: "0" }],
    ["intervalo no permitido", { slot_step_min: "7" }],
    ["modo desconocido", { confirmation_mode: "magia" }],
  ])("rechaza %s", (_, override) => {
    expect(bookingSettingsSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("stationsSchema", () => {
  it("acepta conteos de 0 a 50", () => {
    expect(stationsSchema.parse({ bath: "2", dry: "3", cut: "0" })).toEqual({
      bath: 2,
      dry: 3,
      cut: 0,
    });
    expect(stationsSchema.safeParse({ bath: "51", dry: "1", cut: "1" }).success).toBe(false);
  });
});

describe("hourRangeSchema", () => {
  it("acepta un tramo válido", () => {
    expect(hourRangeSchema.parse({ weekday: "1", opens_at: "08:00", closes_at: "12:30" })).toEqual({
      weekday: 1,
      opens_at: "08:00",
      closes_at: "12:30",
    });
  });

  it("rechaza un cierre igual o anterior a la apertura", () => {
    const result = hourRangeSchema.safeParse({
      weekday: "1",
      opens_at: "12:00",
      closes_at: "08:00",
    });
    expect(result.error?.issues[0].path).toEqual(["closes_at"]);
  });
});

describe("closureSchema", () => {
  it("acepta una fecha ISO y un motivo opcional", () => {
    expect(closureSchema.parse({ date: "2026-12-25", reason: "" })).toEqual({
      date: "2026-12-25",
      reason: null,
    });
    expect(closureSchema.safeParse({ date: "25/12/2026" }).success).toBe(false);
  });
});

describe("applySectionsSchema", () => {
  it("acepta una o más secciones conocidas", () => {
    expect(applySectionsSchema.parse({ sections: ["booking", "hours"] })).toEqual({
      sections: ["booking", "hours"],
    });
  });

  it("exige al menos una y rechaza secciones desconocidas", () => {
    expect(applySectionsSchema.safeParse({ sections: [] }).success).toBe(false);
    expect(applySectionsSchema.safeParse({ sections: ["todo"] }).success).toBe(false);
  });
});
