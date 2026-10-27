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
const slug = `t16-${suffix}`;

let tenantId: string;
let superAdmin: TestUser;
let existing: TestUser;
let outsider: TestUser;
const created: TestUser[] = [];

beforeAll(async () => {
  const { data, error } = await admin
    .from("tenants")
    .insert({ slug, name: "Spa T16" })
    .select("id")
    .single();
  if (error) throw error;
  tenantId = data.id;
  [superAdmin, existing, outsider] = await Promise.all([
    createTestUser("super"),
    createTestUser("existente"),
    createTestUser("externo"),
  ]);
  const { error: e } = await admin.from("platform_admins").insert({ user_id: superAdmin.id });
  if (e) throw e;
});

afterAll(async () => {
  await admin.from("tenants").delete().eq("id", tenantId);
  await deleteTestUsers([superAdmin, existing, outsider, ...created].filter(Boolean));
});

describe("assign_tenant_admin", () => {
  it("con un usuario que ya existe crea la membresía de inmediato", async () => {
    const { data, error } = await superAdmin.client.rpc("assign_tenant_admin", {
      p_tenant_id: tenantId,
      p_email: existing.email.toUpperCase(),
    });
    expect(error).toBeNull();
    expect(data).toBe("member");

    const { data: rows } = await admin
      .from("memberships")
      .select("role")
      .match({ tenant_id: tenantId, user_id: existing.id });
    expect(rows).toEqual([{ role: "admin" }]);
  });

  it("con un correo nuevo deja una invitación que se convierte en membresía al registrarse", async () => {
    const email = `invitado-${suffix}@test.prismalab.local`;
    const { data, error } = await superAdmin.client.rpc("assign_tenant_admin", {
      p_tenant_id: tenantId,
      p_email: email,
    });
    expect(error).toBeNull();
    expect(data).toBe("invited");

    const { data: invites } = await admin
      .from("tenant_invites")
      .select("email")
      .eq("tenant_id", tenantId);
    expect(invites).toEqual([{ email }]);

    // Primer ingreso de esa persona (en producción: con Google).
    const { data: signup, error: signupError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    expect(signupError).toBeNull();
    created.push({ id: signup.user!.id, email, client: admin });

    const { data: membership } = await admin
      .from("memberships")
      .select("role")
      .match({ tenant_id: tenantId, user_id: signup.user!.id });
    expect(membership).toEqual([{ role: "admin" }]);
    const { data: remaining } = await admin
      .from("tenant_invites")
      .select("email")
      .eq("tenant_id", tenantId);
    expect(remaining).toEqual([]);
  });

  it("asignar dos veces al mismo usuario no falla ni duplica", async () => {
    const { error } = await superAdmin.client.rpc("assign_tenant_admin", {
      p_tenant_id: tenantId,
      p_email: existing.email,
    });
    expect(error).toBeNull();
  });

  it("rechaza correos inválidos", async () => {
    const { error } = await superAdmin.client.rpc("assign_tenant_admin", {
      p_tenant_id: tenantId,
      p_email: "no-es-correo",
    });
    expect(error?.message).toMatch(/correo/i);
  });

  it("solo el super admin puede asignar", async () => {
    const { error } = await outsider.client.rpc("assign_tenant_admin", {
      p_tenant_id: tenantId,
      p_email: outsider.email,
    });
    expect(error?.message).toMatch(/super admin/i);
    const { data } = await admin
      .from("memberships")
      .select("user_id")
      .match({ tenant_id: tenantId, user_id: outsider.id });
    expect(data).toEqual([]);
  });
});

describe("tenant_staff", () => {
  it("el super admin ve el correo y rol del staff, más las invitaciones pendientes", async () => {
    const pending = `pendiente-${suffix}@test.prismalab.local`;
    await superAdmin.client.rpc("assign_tenant_admin", { p_tenant_id: tenantId, p_email: pending });

    const { data, error } = await superAdmin.client.rpc("tenant_staff", { p_tenant_id: tenantId });
    expect(error).toBeNull();
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: existing.email, role: "admin", status: "active" }),
        expect.objectContaining({ email: pending, role: "admin", status: "invited" }),
      ]),
    );
  });

  it("nadie más puede listar el staff con correos", async () => {
    const { error } = await outsider.client.rpc("tenant_staff", { p_tenant_id: tenantId });
    expect(error?.message).toMatch(/super admin/i);
  });
});
