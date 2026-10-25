import { describe, expect, it } from "vitest";

import { canManageTenant, homeFor, tenantOrigin, type Viewer } from "./roles";

const viewer = (overrides: Partial<Viewer> = {}): Viewer => ({
  userId: "u1",
  email: "u@x.co",
  isSuperAdmin: false,
  tenants: [],
  ...overrides,
});
const demo = { slug: "demo", name: "Spa Demo" };
const perrunos = { slug: "spaperrunosygatunos", name: "Spa Perrunos y Gatunos" };

describe("homeFor en la consola (admin.*)", () => {
  const platform = { kind: "platform" } as const;

  it("el super admin va a la consola", () => {
    expect(homeFor(platform, viewer({ isSuperAdmin: true, tenants: [demo] }))).toEqual({
      type: "path",
      path: "/",
    });
  });

  it("el admin de un solo spa va directo a su panel", () => {
    expect(homeFor(platform, viewer({ tenants: [demo] }))).toEqual({
      type: "tenant-admin",
      slug: "demo",
    });
  });

  it("el admin de varios spas elige cuál", () => {
    expect(homeFor(platform, viewer({ tenants: [demo, perrunos] }))).toEqual({
      type: "path",
      path: "/elegir",
    });
  });

  it("un cliente sin membresías no tiene acceso a la consola", () => {
    expect(homeFor(platform, viewer())).toEqual({ type: "path", path: "/sin-acceso" });
  });
});

describe("homeFor en un spa", () => {
  const atDemo = { kind: "tenant", slug: "demo" } as const;

  it("el staff del spa va al panel", () => {
    expect(homeFor(atDemo, viewer({ tenants: [demo] }))).toEqual({ type: "path", path: "/admin" });
  });

  it("el super admin va al panel de cualquier spa", () => {
    expect(homeFor(atDemo, viewer({ isSuperAdmin: true }))).toEqual({
      type: "path",
      path: "/admin",
    });
  });

  it("el staff de otro spa es un cliente más aquí", () => {
    expect(homeFor(atDemo, viewer({ tenants: [perrunos] }))).toEqual({ type: "path", path: "/" });
  });

  it("un cliente va a la portada", () => {
    expect(homeFor(atDemo, viewer())).toEqual({ type: "path", path: "/" });
  });
});

describe("canManageTenant", () => {
  it("solo el staff del spa o el super admin", () => {
    expect(canManageTenant(viewer({ tenants: [demo] }), "demo")).toBe(true);
    expect(canManageTenant(viewer({ isSuperAdmin: true }), "demo")).toBe(true);
    expect(canManageTenant(viewer({ tenants: [perrunos] }), "demo")).toBe(false);
    expect(canManageTenant(null, "demo")).toBe(false);
  });
});

describe("tenantOrigin", () => {
  it("cambia el subdominio conservando protocolo y puerto", () => {
    expect(tenantOrigin("http://admin.localhost:3000", "demo")).toBe("http://demo.localhost:3000");
    expect(tenantOrigin("https://admin.prismalab.com.co", "spaperrunosygatunos")).toBe(
      "https://spaperrunosygatunos.prismalab.com.co",
    );
  });
});
