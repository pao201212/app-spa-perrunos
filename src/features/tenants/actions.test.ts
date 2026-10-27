import { describe, expect, it } from "vitest";

import {
  FAIL,
  form,
  IDLE,
  redirectOf,
  server,
  SUPER_ADMIN,
  TENANT,
  UNIQUE,
  withSupabase,
} from "../../../tests/server-env";

import { assignAdminAction, createTenantAction } from "./actions";

const spa = form({
  name: "Spa Nuevo",
  slug: "spa-nuevo",
  timezone: "America/Bogota",
  currency: "COP",
});

describe("consola: spas", () => {
  it("crea el spa y abre su ficha", async () => {
    server.viewer = SUPER_ADMIN;
    withSupabase();
    expect(await redirectOf(() => createTenantAction(IDLE, spa))).toBe("/spas/spa-nuevo");
  });

  it("valida, avisa subdominios usados y errores", async () => {
    server.viewer = SUPER_ADMIN;
    expect(await createTenantAction(IDLE, form({ name: "S", slug: "admin" }))).toMatchObject({
      status: "error",
    });
    withSupabase({ writeError: UNIQUE });
    expect(await createTenantAction(IDLE, spa)).toMatchObject({
      fieldErrors: { slug: "Ese subdominio ya está en uso" },
    });
    withSupabase({ writeError: FAIL });
    expect(await createTenantAction(IDLE, spa)).toMatchObject({
      message: "No pudimos crear el spa. Intenta de nuevo.",
    });
  });

  it("asigna administradores o deja la invitación", async () => {
    server.viewer = SUPER_ADMIN;
    withSupabase({ rpcs: { assign_tenant_admin: { data: "member", error: null } } });
    expect(await assignAdminAction(TENANT.id, IDLE, form({ email: "ANA@spa.test" }))).toEqual({
      status: "success",
      message: "ana@spa.test ya puede administrar este spa.",
    });
    withSupabase({ rpcs: { assign_tenant_admin: { data: "invited", error: null } } });
    expect(
      await assignAdminAction(TENANT.id, IDLE, form({ email: "luis@spa.test" })),
    ).toMatchObject({
      message: "Invitación enviada: luis@spa.test tendrá acceso cuando ingrese con Google.",
    });
    expect(await assignAdminAction(TENANT.id, IDLE, form({ email: "no" }))).toMatchObject({
      status: "error",
    });
    withSupabase({ rpcError: FAIL });
    expect(
      await assignAdminAction(TENANT.id, IDLE, form({ email: "luis@spa.test" })),
    ).toMatchObject({
      message: "No pudimos agregar al administrador.",
    });
  });
});
