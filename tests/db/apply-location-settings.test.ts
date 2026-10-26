import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  createTestUser,
  deleteTestUsers,
  uniqueSuffix,
  type TestUser,
} from "./helpers";

const admin = adminClient();
const suffix = uniqueSuffix();

let tenantA: string;
let tenantB: string;
let staffA: TestUser;
let staffB: TestUser;
let source: string;
let targets: string[];
let foreign: string;

async function seedLocation(
  tenantId: string,
  name: string,
  settings: Record<string, unknown> = {},
) {
  const { data, error } = await admin
    .from("locations")
    .insert({ tenant_id: tenantId, name, ...settings })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

beforeAll(async () => {
  const { data, error } = await admin
    .from("tenants")
    .insert([
      { slug: `apl-a-${suffix}`, name: "Aplicar A", is_active: true },
      { slug: `apl-b-${suffix}`, name: "Aplicar B", is_active: true },
    ])
    .select("id, slug");
  if (error) throw error;
  tenantA = data.find((t) => t.slug.startsWith("apl-a"))!.id;
  tenantB = data.find((t) => t.slug.startsWith("apl-b"))!.id;

  [staffA, staffB] = await Promise.all([
    createTestUser("staff-apl-a"),
    createTestUser("staff-apl-b"),
  ]);
  await admin.from("memberships").insert([
    { tenant_id: tenantA, user_id: staffA.id, role: "admin" },
    { tenant_id: tenantB, user_id: staffB.id, role: "admin" },
  ]);

  source = await seedLocation(tenantA, "Origen", {
    confirmation_mode: "manual",
    cancel_window_hours: 12,
    max_days_ahead: 10,
    slot_step_min: 30,
    bather_continues_drying: false,
  });
  targets = [await seedLocation(tenantA, "Destino 1"), await seedLocation(tenantA, "Destino 2")];
  foreign = await seedLocation(tenantB, "De otro spa");

  const base = (locationId: string, tenantId = tenantA) => ({
    tenant_id: tenantId,
    location_id: locationId,
  });
  await admin.from("location_stations").insert([
    { ...base(source), station: "bath", count: 3 },
    { ...base(source), station: "dry", count: 4 },
    { ...base(source), station: "finish", count: 2 },
    { ...base(targets[0]), station: "bath", count: 1 },
  ]);
  await admin.from("location_hours").insert([
    { ...base(source), weekday: 1, opens_at: "08:00", closes_at: "12:00" },
    { ...base(source), weekday: 1, opens_at: "14:00", closes_at: "18:00" },
    { ...base(targets[0]), weekday: 6, opens_at: "09:00", closes_at: "11:00" },
    { ...base(foreign, tenantB), weekday: 2, opens_at: "07:00", closes_at: "09:00" },
  ]);
  await admin.from("location_closures").insert([
    { ...base(source), date: "2026-12-25", reason: "Navidad" },
    { ...base(targets[1]), date: "2026-11-15", reason: "Remodelación" },
  ]);
});

afterAll(async () => {
  await admin.from("tenants").delete().in("id", [tenantA, tenantB]);
  await deleteTestUsers([staffA, staffB].filter(Boolean));
});

describe("apply_location_settings", () => {
  it("copia ajustes de reserva, estaciones y horario a los demás locales del spa", async () => {
    const { data, error } = await staffA.client.rpc("apply_location_settings", {
      p_source_location_id: source,
      p_sections: ["booking", "stations", "hours"],
    });
    expect(error).toBeNull();
    expect(data).toBe(2);

    const { data: locations } = await admin
      .from("locations")
      .select(
        "confirmation_mode, cancel_window_hours, max_days_ahead, slot_step_min, bather_continues_drying",
      )
      .in("id", targets);
    for (const location of locations ?? []) {
      expect(location).toEqual({
        confirmation_mode: "manual",
        cancel_window_hours: 12,
        max_days_ahead: 10,
        slot_step_min: 30,
        bather_continues_drying: false,
      });
    }

    for (const target of targets) {
      const { data: stations } = await admin
        .from("location_stations")
        .select("station, count")
        .eq("location_id", target)
        .order("station");
      expect(stations).toEqual([
        { station: "bath", count: 3 },
        { station: "dry", count: 4 },
        { station: "finish", count: 2 },
      ]);
      const { data: hours } = await admin
        .from("location_hours")
        .select("weekday, opens_at, closes_at")
        .eq("location_id", target)
        .order("opens_at");
      // El horario anterior (sábado) se reemplaza.
      expect(hours).toEqual([
        { weekday: 1, opens_at: "08:00:00", closes_at: "12:00:00" },
        { weekday: 1, opens_at: "14:00:00", closes_at: "18:00:00" },
      ]);
    }
  });

  it("los días de cierre se suman sin borrar los propios de cada local", async () => {
    const { error } = await staffA.client.rpc("apply_location_settings", {
      p_source_location_id: source,
      p_sections: ["closures"],
    });
    expect(error).toBeNull();
    const { data } = await admin
      .from("location_closures")
      .select("date, reason")
      .eq("location_id", targets[1])
      .order("date");
    expect(data).toEqual([
      { date: "2026-11-15", reason: "Remodelación" },
      { date: "2026-12-25", reason: "Navidad" },
    ]);
  });

  it("nunca toca locales de otro spa", async () => {
    const { data } = await admin
      .from("location_hours")
      .select("weekday")
      .eq("location_id", foreign);
    expect(data).toEqual([{ weekday: 2 }]);
  });

  it("el staff de otro spa no puede usar un local ajeno como origen", async () => {
    const { error } = await staffB.client.rpc("apply_location_settings", {
      p_source_location_id: source,
      p_sections: ["hours"],
    });
    expect(error?.message).toMatch(/local/i);
  });

  it("rechaza secciones desconocidas", async () => {
    const { error } = await staffA.client.rpc("apply_location_settings", {
      p_source_location_id: source,
      p_sections: ["todo"],
    });
    expect(error?.message).toMatch(/secci/i);
  });
});
