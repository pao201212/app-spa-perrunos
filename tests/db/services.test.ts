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
let staffA: TestUser;
let staffB: TestUser;
let locationA: string;
let locationB: string;
let category: string;
let bath: string;
let cut: string;
let nails: string;
let extra: string;

beforeAll(async () => {
  const { data, error } = await admin
    .from("tenants")
    .insert([
      { slug: `srv-a-${suffix}`, name: "Servicios A", is_active: true },
      { slug: `srv-b-${suffix}`, name: "Servicios B", is_active: true },
    ])
    .select("id, slug");
  if (error) throw error;
  tenantA = data.find((t) => t.slug.startsWith("srv-a"))!.id;
  tenantB = data.find((t) => t.slug.startsWith("srv-b"))!.id;
  [staffA, staffB] = await Promise.all([
    createTestUser("staff-srv-a"),
    createTestUser("staff-srv-b"),
  ]);
  await admin.from("memberships").insert([
    { tenant_id: tenantA, user_id: staffA.id, role: "admin" },
    { tenant_id: tenantB, user_id: staffB.id, role: "admin" },
  ]);
  const { data: locations } = await admin
    .from("locations")
    .insert([
      { tenant_id: tenantA, name: "Sede A" },
      { tenant_id: tenantB, name: "Sede B" },
    ])
    .select("id, tenant_id");
  locationA = locations!.find((l) => l.tenant_id === tenantA)!.id;
  locationB = locations!.find((l) => l.tenant_id === tenantB)!.id;
});

afterAll(async () => {
  await admin.from("tenants").delete().in("id", [tenantA, tenantB]);
  await deleteTestUsers([staffA, staffB].filter(Boolean));
});

describe("categorías y servicios", () => {
  it("el staff crea categorías y servicios de cada tipo", async () => {
    const cat = await staffA.client
      .from("service_categories")
      .insert({ tenant_id: tenantA, name: "Higiene" })
      .select("id")
      .single();
    expect(cat.error).toBeNull();
    category = cat.data!.id;

    const { data, error } = await staffA.client
      .from("services")
      .insert([
        { tenant_id: tenantA, category_id: category, kind: "bath", name: "Baño", species: "both" },
        {
          tenant_id: tenantA,
          category_id: category,
          kind: "special_cut",
          name: "Corte de raza",
          species: "dog",
        },
        { tenant_id: tenantA, kind: "other", name: "Corte de uñas", species: "both" },
      ])
      .select("id, kind, is_active");
    expect(error).toBeNull();
    expect(data?.every((s) => s.is_active)).toBe(true);
    bath = data!.find((s) => s.kind === "bath")!.id;
    cut = data!.find((s) => s.kind === "special_cut")!.id;
    nails = data!.find((s) => s.kind === "other")!.id;
  });

  it("no repite nombres de servicio en el spa", async () => {
    const { error } = await admin
      .from("services")
      .insert({ tenant_id: tenantA, kind: "bath", name: "baño", species: "dog" });
    expect(error?.code).toBe("23505");
  });

  it("anon ve los servicios activos, no los inactivos", async () => {
    await staffA.client.from("services").update({ is_active: false }).eq("id", nails);
    const { data } = await anonClient()
      .from("services")
      .select("name")
      .eq("tenant_id", tenantA)
      .order("name");
    expect(data?.map((s) => s.name)).toEqual(["Baño", "Corte de raza"]);
    await staffA.client.from("services").update({ is_active: true }).eq("id", nails);
  });

  it("el staff de B no puede tocar los servicios de A", async () => {
    const { data } = await staffB.client
      .from("services")
      .update({ name: "Hackeado" })
      .eq("id", bath)
      .select();
    expect(data ?? []).toEqual([]);
    const foreignCategory = await admin.from("services").insert({
      tenant_id: tenantB,
      category_id: category,
      kind: "bath",
      name: "Cruzado",
      species: "dog",
    });
    expect(foreignCategory.error?.code).toBe("23503");
  });
});

describe("extras", () => {
  it("se asocian a un servicio del mismo spa y pueden sumar minutos a los detalles", async () => {
    const { data, error } = await staffA.client
      .from("extras")
      .insert({
        tenant_id: tenantA,
        service_id: bath,
        name: "Cepillado profundo",
        extra_minutes: 10,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    extra = data!.id;

    const notMultiple = await admin
      .from("extras")
      .insert({ tenant_id: tenantA, service_id: bath, name: "Raro", extra_minutes: 7 });
    expect(notMultiple.error).not.toBeNull();
    const crossTenant = await admin
      .from("extras")
      .insert({ tenant_id: tenantB, service_id: bath, name: "Cruzado" });
    expect(crossTenant.error?.code).toBe("23503");
  });
});

describe("service_durations (por spa, talla × pelo; D7)", () => {
  it("el baño tiene baño, secado y detalles", async () => {
    const ok = await staffA.client.from("service_durations").insert({
      tenant_id: tenantA,
      service_id: bath,
      size: "M",
      coat: "long",
      bath_min: 40,
      dry_min: 30,
      details_min: 20,
    });
    expect(ok.error).toBeNull();
    const missingDry = await admin.from("service_durations").insert({
      tenant_id: tenantA,
      service_id: bath,
      size: "L",
      coat: "long",
      bath_min: 40,
      details_min: 20,
    });
    expect(missingDry.error?.message).toMatch(/baño, secado y detalles/i);
  });

  it("el corte especial solo tiene minutos de corte; 'otro' solo de detalles", async () => {
    const cutOk = await admin
      .from("service_durations")
      .insert({ tenant_id: tenantA, service_id: cut, size: "M", coat: "long", cut_min: 60 });
    expect(cutOk.error).toBeNull();
    const cutWrong = await admin.from("service_durations").insert({
      tenant_id: tenantA,
      service_id: cut,
      size: "S",
      coat: "long",
      cut_min: 45,
      bath_min: 10,
    });
    expect(cutWrong.error).not.toBeNull();
    const nailsOk = await admin
      .from("service_durations")
      .insert({ tenant_id: tenantA, service_id: nails, size: "M", coat: "short", details_min: 15 });
    expect(nailsOk.error).toBeNull();
  });

  it("los minutos son múltiplos de 5", async () => {
    const { error } = await admin.from("service_durations").insert({
      tenant_id: tenantA,
      service_id: bath,
      size: "XS",
      coat: "short",
      bath_min: 33,
      dry_min: 30,
      details_min: 20,
    });
    expect(error).not.toBeNull();
  });
});

describe("precios por local (local × talla × pelo; D8)", () => {
  it("el staff fija precios de servicios y extras en sus locales", async () => {
    const service = await staffA.client.from("location_service_prices").insert({
      tenant_id: tenantA,
      location_id: locationA,
      service_id: bath,
      size: "M",
      coat: "long",
      price_cop: 55000,
    });
    expect(service.error).toBeNull();
    const extraPrice = await staffA.client.from("location_extra_prices").insert({
      tenant_id: tenantA,
      location_id: locationA,
      extra_id: extra,
      size: "M",
      coat: "long",
      price_cop: 8000,
    });
    expect(extraPrice.error).toBeNull();
  });

  it("los precios son públicos para el catálogo", async () => {
    const { data } = await anonClient()
      .from("location_service_prices")
      .select("price_cop")
      .match({ location_id: locationA, service_id: bath, size: "M", coat: "long" });
    expect(data).toEqual([{ price_cop: 55000 }]);
  });

  it("no admite precios negativos ni cruzar spas", async () => {
    const negative = await admin.from("location_service_prices").insert({
      tenant_id: tenantA,
      location_id: locationA,
      service_id: bath,
      size: "S",
      coat: "long",
      price_cop: -1,
    });
    expect(negative.error).not.toBeNull();
    const crossLocation = await admin.from("location_service_prices").insert({
      tenant_id: tenantA,
      location_id: locationB,
      service_id: bath,
      size: "S",
      coat: "long",
      price_cop: 1,
    });
    expect(crossLocation.error?.code).toBe("23503");
  });

  it("el staff de B no puede cambiar precios de A", async () => {
    const { data } = await staffB.client
      .from("location_service_prices")
      .update({ price_cop: 1 })
      .match({ location_id: locationA, service_id: bath })
      .select();
    expect(data ?? []).toEqual([]);
  });
});

describe("replace_service_durations", () => {
  it("reemplaza todas las duraciones del servicio en una transacción", async () => {
    const { error } = await staffA.client.rpc("replace_service_durations", {
      p_service_id: bath,
      p_rows: [
        { size: "S", coat: "short", bath_min: 30, dry_min: 20, details_min: 15 },
        { size: "L", coat: "long", bath_min: 60, dry_min: 50, details_min: 25 },
      ],
    });
    expect(error).toBeNull();
    const { data } = await admin
      .from("service_durations")
      .select("size, coat")
      .eq("service_id", bath)
      .order("size");
    expect(data).toEqual([
      { size: "S", coat: "short" },
      { size: "L", coat: "long" },
    ]);
  });

  it("si alguna fila es inválida no cambia nada", async () => {
    const { error } = await staffA.client.rpc("replace_service_durations", {
      p_service_id: bath,
      p_rows: [
        { size: "XS", coat: "short", bath_min: 30, dry_min: 20, details_min: 15 },
        { size: "M", coat: "short", bath_min: 30 },
      ],
    });
    expect(error).not.toBeNull();
    const { count } = await admin
      .from("service_durations")
      .select("*", { count: "exact", head: true })
      .eq("service_id", bath);
    expect(count).toBe(2);
  });

  it("el staff de otro spa no puede reemplazarlas", async () => {
    const { error } = await staffB.client.rpc("replace_service_durations", {
      p_service_id: bath,
      p_rows: [],
    });
    expect(error?.message).toMatch(/servicio/i);
    const { count } = await admin
      .from("service_durations")
      .select("*", { count: "exact", head: true })
      .eq("service_id", bath);
    expect(count).toBe(2);
  });
});

describe("replace_location_prices y copy_service_prices", () => {
  let secondLocation: string;

  beforeAll(async () => {
    const { data } = await admin
      .from("locations")
      .insert({ tenant_id: tenantA, name: "Sede A2" })
      .select("id")
      .single();
    secondLocation = data!.id;
  });

  it("reemplaza los precios del servicio y sus extras en un local, en una transacción", async () => {
    const { error } = await staffA.client.rpc("replace_location_prices", {
      p_location_id: locationA,
      p_service_id: bath,
      p_service_rows: [
        { size: "S", coat: "short", price_cop: 40000 },
        { size: "L", coat: "long", price_cop: 70000 },
      ],
      p_extra_rows: [{ extra_id: extra, size: "S", coat: "short", price_cop: 6000 }],
    });
    expect(error).toBeNull();
    const { data } = await admin
      .from("location_service_prices")
      .select("size, price_cop")
      .match({ location_id: locationA, service_id: bath })
      .order("size");
    expect(data).toEqual([
      { size: "S", price_cop: 40000 },
      { size: "L", price_cop: 70000 },
    ]);
    const { data: extras } = await admin
      .from("location_extra_prices")
      .select("size")
      .match({ location_id: locationA, extra_id: extra });
    expect(extras).toEqual([{ size: "S" }]);
  });

  it("rechaza extras de otro servicio y no cambia nada", async () => {
    const { data: otherExtra } = await admin
      .from("extras")
      .insert({ tenant_id: tenantA, service_id: cut, name: `Extra corte ${suffix}` })
      .select("id")
      .single();
    const { error } = await staffA.client.rpc("replace_location_prices", {
      p_location_id: locationA,
      p_service_id: bath,
      p_service_rows: [],
      p_extra_rows: [{ extra_id: otherExtra!.id, size: "S", coat: "short", price_cop: 1 }],
    });
    expect(error?.message).toMatch(/extra/i);
    const { count } = await admin
      .from("location_service_prices")
      .select("*", { count: "exact", head: true })
      .match({ location_id: locationA, service_id: bath });
    expect(count).toBe(2);
  });

  it("copia los precios del servicio y sus extras a los demás locales del spa", async () => {
    const { data, error } = await staffA.client.rpc("copy_service_prices", {
      p_service_id: bath,
      p_source_location_id: locationA,
    });
    expect(error).toBeNull();
    expect(data).toBe(1);
    const { data: copied } = await admin
      .from("location_service_prices")
      .select("size, price_cop")
      .match({ location_id: secondLocation, service_id: bath })
      .order("size");
    expect(copied).toEqual([
      { size: "S", price_cop: 40000 },
      { size: "L", price_cop: 70000 },
    ]);
    const { count } = await admin
      .from("location_extra_prices")
      .select("*", { count: "exact", head: true })
      .match({ location_id: secondLocation, extra_id: extra });
    expect(count).toBe(1);
  });

  it("el staff de otro spa no puede usarlas", async () => {
    const replace = await staffB.client.rpc("replace_location_prices", {
      p_location_id: locationA,
      p_service_id: bath,
      p_service_rows: [],
      p_extra_rows: [],
    });
    expect(replace.error).not.toBeNull();
    const copy = await staffB.client.rpc("copy_service_prices", {
      p_service_id: bath,
      p_source_location_id: locationA,
    });
    expect(copy.error).not.toBeNull();
  });
});

describe("service_options (opcionales sin costo, D26)", () => {
  it("el staff crea opcionales marcados para la etapa de baño o de detalles", async () => {
    const { data, error } = await staffA.client
      .from("service_options")
      .insert([
        { tenant_id: tenantA, service_id: bath, name: "Shampoo hipoalergénico", stage: "bath" },
        { tenant_id: tenantA, service_id: bath, name: "Corte higiénico", stage: "details" },
      ])
      .select("name, stage, is_active");
    expect(error).toBeNull();
    expect(data?.every((o) => o.is_active)).toBe(true);
  });

  it("no repite nombres en el mismo servicio y no admite etapas desconocidas", async () => {
    const duplicate = await admin
      .from("service_options")
      .insert({ tenant_id: tenantA, service_id: bath, name: "corte higiénico", stage: "details" });
    expect(duplicate.error?.code).toBe("23505");
    const badStage = await admin
      .from("service_options")
      .insert({ tenant_id: tenantA, service_id: bath, name: "Raro", stage: "drying" as "bath" });
    expect(badStage.error).not.toBeNull();
  });

  it("los activos son públicos; el staff de otro spa no los modifica", async () => {
    const { data } = await anonClient()
      .from("service_options")
      .select("name")
      .eq("service_id", bath)
      .order("name");
    expect(data?.map((o) => o.name)).toEqual(["Corte higiénico", "Shampoo hipoalergénico"]);
    const foreign = await staffB.client
      .from("service_options")
      .update({ name: "X" })
      .eq("service_id", bath)
      .select();
    expect(foreign.data ?? []).toEqual([]);
  });
});
