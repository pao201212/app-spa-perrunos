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
const activeSlug = `t5-activo-${suffix}`;
const inactiveSlug = `t5-inactivo-${suffix}`;

let activeTenantId: string;
let inactiveTenantId: string;
let member: TestUser;
let outsider: TestUser;
let superAdmin: TestUser;

beforeAll(async () => {
  const { data, error } = await admin
    .from("tenants")
    .insert([
      { slug: activeSlug, name: "Spa Activo", is_active: true },
      { slug: inactiveSlug, name: "Spa Inactivo", is_active: false },
    ])
    .select("id, slug");
  if (error) throw error;
  activeTenantId = data.find((t) => t.slug === activeSlug)!.id;
  inactiveTenantId = data.find((t) => t.slug === inactiveSlug)!.id;

  [member, outsider, superAdmin] = await Promise.all([
    createTestUser("miembro"),
    createTestUser("externo"),
    createTestUser("superadmin"),
  ]);

  const { error: membershipError } = await admin
    .from("memberships")
    .insert({ tenant_id: inactiveTenantId, user_id: member.id, role: "admin" });
  if (membershipError) throw membershipError;

  const { error: superError } = await admin
    .from("platform_admins")
    .insert({ user_id: superAdmin.id });
  if (superError) throw superError;
});

afterAll(async () => {
  await admin.from("tenants").delete().in("slug", [activeSlug, inactiveSlug]);
  await deleteTestUsers([member, outsider, superAdmin].filter(Boolean));
});

describe("tenants", () => {
  it("el seed incluye a Spa Perrunos y Gatunos con zona horaria y moneda de Colombia", async () => {
    const { data, error } = await anonClient()
      .from("tenants")
      .select("slug, name, timezone, currency")
      .eq("slug", "spaperrunosygatunos")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({
      slug: "spaperrunosygatunos",
      name: "Spa Perrunos y Gatunos",
      timezone: "America/Bogota",
      currency: "COP",
    });
  });

  it("anon ve los tenants activos pero no los inactivos", async () => {
    const { data } = await anonClient()
      .from("tenants")
      .select("slug")
      .in("slug", [activeSlug, inactiveSlug]);
    expect(data?.map((t) => t.slug)).toEqual([activeSlug]);
  });

  it("el staff de un tenant inactivo puede verlo; un externo no", async () => {
    const asMember = await member.client.from("tenants").select("slug").eq("id", inactiveTenantId);
    const asOutsider = await outsider.client
      .from("tenants")
      .select("slug")
      .eq("id", inactiveTenantId);
    expect(asMember.data).toEqual([{ slug: inactiveSlug }]);
    expect(asOutsider.data).toEqual([]);
  });

  it.each(["admin", "www", "api", "Mayusculas", "con_guion_bajo", "-inicia-con-guion"])(
    "rechaza el slug inválido o reservado %s",
    async (slug) => {
      const { error } = await admin.from("tenants").insert({ slug, name: "x" });
      expect(error).not.toBeNull();
    },
  );

  it("solo el super admin puede crear y editar tenants", async () => {
    const slug = `t5-nuevo-${suffix}`;
    const denied = await member.client.from("tenants").insert({ slug, name: "Intento" });
    expect(denied.error).not.toBeNull();

    const notUpdated = await member.client
      .from("tenants")
      .update({ name: "Hackeado" })
      .eq("id", inactiveTenantId)
      .select();
    expect(notUpdated.data ?? []).toEqual([]);

    const created = await superAdmin.client
      .from("tenants")
      .insert({ slug, name: "Creado por super admin" })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    await admin.from("tenants").delete().eq("id", created.data!.id);
  });
});

describe("memberships", () => {
  it("anon no puede leer membresías", async () => {
    const { data } = await anonClient().from("memberships").select("*");
    expect(data ?? []).toEqual([]);
  });

  it("cada usuario ve sus propias membresías y no las de otros", async () => {
    const own = await member.client.from("memberships").select("tenant_id, role");
    const other = await outsider.client
      .from("memberships")
      .select("tenant_id")
      .eq("user_id", member.id);
    expect(own.data).toEqual([{ tenant_id: inactiveTenantId, role: "admin" }]);
    expect(other.data).toEqual([]);
  });

  it("un usuario no puede asignarse una membresía a sí mismo", async () => {
    const { error } = await outsider.client
      .from("memberships")
      .insert({ tenant_id: activeTenantId, user_id: outsider.id, role: "admin" });
    expect(error).not.toBeNull();
  });

  it("el super admin asigna membresías y ve las de todos los tenants", async () => {
    const insert = await superAdmin.client
      .from("memberships")
      .insert({ tenant_id: activeTenantId, user_id: outsider.id, role: "admin" });
    expect(insert.error).toBeNull();

    const { data } = await superAdmin.client
      .from("memberships")
      .select("user_id")
      .in("tenant_id", [activeTenantId, inactiveTenantId]);
    expect(data?.map((m) => m.user_id).sort()).toEqual([member.id, outsider.id].sort());
  });
});

describe("platform_admins", () => {
  it("un usuario normal no puede hacerse super admin", async () => {
    const { error } = await outsider.client
      .from("platform_admins")
      .insert({ user_id: outsider.id });
    expect(error).not.toBeNull();
  });
});
