import { describe, expect, it } from "vitest";

import { isValidTenantSlug, resolveHost } from "./host";

describe("resolveHost en producción (prismalab.com.co)", () => {
  const root = "prismalab.com.co";

  it("resuelve el subdominio de un spa", () => {
    expect(resolveHost("spaperrunosygatunos.prismalab.com.co", root)).toEqual({
      kind: "tenant",
      slug: "spaperrunosygatunos",
    });
  });

  it("ignora mayúsculas y el puerto", () => {
    expect(resolveHost("SpaPerrunosYGatunos.PrismaLab.com.co:443", root)).toEqual({
      kind: "tenant",
      slug: "spaperrunosygatunos",
    });
  });

  it("admin.* es la consola de plataforma", () => {
    expect(resolveHost("admin.prismalab.com.co", root)).toEqual({ kind: "platform" });
  });

  it.each([
    ["el dominio raíz", "prismalab.com.co"],
    ["www del dominio raíz", "www.prismalab.com.co"],
    ["www delante de un spa (S5)", "www.spaperrunosygatunos.prismalab.com.co"],
    ["un subdominio reservado", "api.prismalab.com.co"],
    ["un slug con caracteres inválidos", "spa_perrunos.prismalab.com.co"],
    ["otro dominio", "spaperrunosygatunos.otrodominio.com"],
    ["un dominio que solo termina igual", "spa.fakeprismalab.com.co"],
    ["un host vacío", ""],
  ])("no resuelve %s", (_, host) => {
    expect(resolveHost(host, root)).toEqual({ kind: "unknown" });
  });
});

describe("resolveHost en desarrollo (localhost)", () => {
  it("resuelve {slug}.localhost:3000", () => {
    expect(resolveHost("demo.localhost:3000", "localhost")).toEqual({
      kind: "tenant",
      slug: "demo",
    });
  });

  it("admin.localhost:3000 es la consola", () => {
    expect(resolveHost("admin.localhost:3000", "localhost")).toEqual({ kind: "platform" });
  });

  it("localhost sin subdominio no resuelve", () => {
    expect(resolveHost("localhost:3000", "localhost")).toEqual({ kind: "unknown" });
  });
});

describe("isValidTenantSlug (mismas reglas que la BD)", () => {
  it.each(["demo", "spaperrunosygatunos", "spa-2", "a1"])("acepta %s", (slug) => {
    expect(isValidTenantSlug(slug)).toBe(true);
  });

  it.each([
    "admin",
    "www",
    "api",
    "app",
    "auth",
    "platform",
    "-spa",
    "spa-",
    "Spa",
    "a".repeat(41),
  ])("rechaza %s", (slug) => {
    expect(isValidTenantSlug(slug)).toBe(false);
  });
});
