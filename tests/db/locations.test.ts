import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUsers,
  uniqueSuffix,
  type TestUser,
} from "./helpers";

const admin = adminClient();
const suffix = uniqueSuffix();

let tenantA: string;
let tenantB: string;
let inactiveTenant: string;
let staffA: TestUser;
let locationA: string;
let locationB: string;

beforeAll(async () => {
  const { data, error } = await admin
    .from("tenants")
    .insert([
      { slug: `loc-a-${suffix}`, name: "Locales A", is_active: true },
      { slug: `loc-b-${suffix}`, name: "Locales B", is_active: true },
      { slug: `loc-off-${suffix}`, name: "Locales inactivo", is_active: false },
    ])
    .select("id, slug");
  if (error) throw error;
  tenantA = data.find((t) => t.slug.startsWith("loc-a"))!.id;
  tenantB = data.find((t) => t.slug.startsWith("loc-b"))!.id;
  inactiveTenant = data.find((t) => t.slug.startsWith("loc-off"))!.id;

  staffA = await createTestUser("staff-locales");
  await admin.from("memberships").insert({ tenant_id: tenantA, user_id: staffA.id, role: "admin" });

  const locations = await admin
    .from("locations")
    .insert([
      { tenant_id: tenantA, name: "Sede Norte" },
      { tenant_id: tenantB, name: "Sede B" },
      { tenant_id: inactiveTenant, name: "Sede de spa inactivo" },
    ])
    .select("id, tenant_id");
  if (locations.error) throw locations.error;
  locationA = locations.data.find((l) => l.tenant_id === tenantA)!.id;
  locationB = locations.data.find((l) => l.tenant_id === tenantB)!.id;
});

afterAll(async () => {
  await admin.from("tenants").delete().in("id", [tenantA, tenantB, inactiveTenant]);
  await deleteTestUsers([staffA].filter(Boolean));
});

describe("locations", () => {
  it("se crea con la configuración por defecto del spec (D4)", async () => {
    const { data } = await admin
      .from("locations")
      .select(
        "confirmation_mode, cancel_window_hours, max_days_ahead, bather_continues_drying, slot_step_min, capacity_mode, is_active",
      )
      .eq("id", locationA)
      .single();
    expect(data).toEqual({
      confirmation_mode: "auto",
      cancel_window_hours: 4,
      max_days_ahead: 30,
      bather_continues_drying: true,
      slot_step_min: 15,
      capacity_mode: "simple",
      is_active: true,
    });
  });

  it("anon ve los locales activos de spas activos, no los de spas inactivos", async () => {
    const { data } = await anonClient()
      .from("locations")
      .select("name")
      .in("tenant_id", [tenantA, inactiveTenant]);
    expect(data?.map((l) => l.name)).toEqual(["Sede Norte"]);
  });

  it("el staff gestiona los locales de su spa", async () => {
    const created = await staffA.client
      .from("locations")
      .insert({ tenant_id: tenantA, name: "Sede Sur", address: "Calle 1 # 2-3" })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const updated = await staffA.client
      .from("locations")
      .update({ max_days_ahead: 15 })
      .eq("id", created.data!.id)
      .select("max_days_ahead")
      .single();
    expect(updated.data).toEqual({ max_days_ahead: 15 });
  });

  it("el staff de A no puede crear ni editar locales de B", async () => {
    const insert = await staffA.client
      .from("locations")
      .insert({ tenant_id: tenantB, name: "Intrusa" });
    expect(insert.error).not.toBeNull();
    const update = await staffA.client
      .from("locations")
      .update({ name: "Hackeada" })
      .eq("id", locationB)
      .select();
    expect(update.data ?? []).toEqual([]);
  });

  it("no admite dos locales con el mismo nombre en un spa", async () => {
    const { error } = await admin
      .from("locations")
      .insert({ tenant_id: tenantA, name: "sede norte" });
    expect(error?.code).toBe("23505");
  });

  it("valida la configuración", async () => {
    for (const invalid of [
      { cancel_window_hours: -1 },
      { max_days_ahead: 0 },
      { slot_step_min: 7 },
    ]) {
      const { error } = await admin.from("locations").update(invalid).eq("id", locationA);
      expect(error, JSON.stringify(invalid)).not.toBeNull();
    }
  });
});

describe("stations (tinas y mesas, D27)", () => {
  it("guarda tinas y mesas, una por una", async () => {
    const { error } = await staffA.client.from("stations").insert([
      {
        tenant_id: tenantA,
        location_id: locationA,
        name: "Tina 1",
        kind: "tub",
        for_special_cut: false,
      },
      {
        tenant_id: tenantA,
        location_id: locationA,
        name: "Mesa 1",
        kind: "table",
        for_special_cut: false,
      },
      {
        tenant_id: tenantA,
        location_id: locationA,
        name: "Mesa 2",
        kind: "table",
        for_special_cut: true,
      },
    ]);
    expect(error).toBeNull();
  });

  it("una tina no puede ser de corte especial", async () => {
    const { error } = await admin.from("stations").insert({
      tenant_id: tenantA,
      location_id: locationA,
      name: "Tina rara",
      kind: "tub",
      for_special_cut: true,
    });
    expect(error?.code).toBe("23514");
  });

  it("no repite nombres en el mismo local (sin importar mayúsculas)", async () => {
    const { error } = await admin.from("stations").insert({
      tenant_id: tenantA,
      location_id: locationA,
      name: "tina 1",
      kind: "tub",
      for_special_cut: false,
    });
    expect(error?.code).toBe("23505");
  });

  it("no permite referenciar un local de otro spa (FK compuesta con tenant_id)", async () => {
    const { error } = await admin.from("stations").insert({
      tenant_id: tenantA,
      location_id: locationB,
      name: "Tina X",
      kind: "tub",
      for_special_cut: false,
    });
    expect(error?.code).toBe("23503");
  });

  it("es interna: anon no la ve", async () => {
    const { data } = await anonClient().from("stations").select("*").eq("location_id", locationA);
    expect(data ?? []).toEqual([]);
  });
});

describe("location_hours", () => {
  it("admite varios tramos por día (p. ej. mañana y tarde) y son públicos", async () => {
    const { error } = await staffA.client.from("location_hours").insert([
      {
        tenant_id: tenantA,
        location_id: locationA,
        weekday: 1,
        opens_at: "08:00",
        closes_at: "12:00",
      },
      {
        tenant_id: tenantA,
        location_id: locationA,
        weekday: 1,
        opens_at: "13:00",
        closes_at: "17:30",
      },
    ]);
    expect(error).toBeNull();
    const { data } = await anonClient()
      .from("location_hours")
      .select("opens_at, closes_at")
      .match({ location_id: locationA, weekday: 1 })
      .order("opens_at");
    expect(data).toEqual([
      { opens_at: "08:00:00", closes_at: "12:00:00" },
      { opens_at: "13:00:00", closes_at: "17:30:00" },
    ]);
  });

  it("rechaza tramos que se solapan en el mismo día", async () => {
    const { error } = await admin.from("location_hours").insert({
      tenant_id: tenantA,
      location_id: locationA,
      weekday: 1,
      opens_at: "11:00",
      closes_at: "14:00",
    });
    expect(error?.code).toBe("23P01");
  });

  it("rechaza un cierre antes de la apertura y días fuera de 0-6", async () => {
    const backwards = await admin.from("location_hours").insert({
      tenant_id: tenantA,
      location_id: locationA,
      weekday: 2,
      opens_at: "17:00",
      closes_at: "08:00",
    });
    expect(backwards.error).not.toBeNull();
    const badDay = await admin.from("location_hours").insert({
      tenant_id: tenantA,
      location_id: locationA,
      weekday: 7,
      opens_at: "08:00",
      closes_at: "12:00",
    });
    expect(badDay.error).not.toBeNull();
  });
});

describe("location_closures", () => {
  it("registra días de cierre únicos por local, visibles al público", async () => {
    const first = await staffA.client.from("location_closures").insert({
      tenant_id: tenantA,
      location_id: locationA,
      date: "2026-12-25",
      reason: "Navidad",
    });
    expect(first.error).toBeNull();
    const repeated = await admin
      .from("location_closures")
      .insert({ tenant_id: tenantA, location_id: locationA, date: "2026-12-25" });
    expect(repeated.error?.code).toBe("23505");

    const { data } = await anonClient()
      .from("location_closures")
      .select("date, reason")
      .eq("location_id", locationA);
    expect(data).toEqual([{ date: "2026-12-25", reason: "Navidad" }]);
  });
});
