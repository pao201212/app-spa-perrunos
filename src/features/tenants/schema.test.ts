import { describe, expect, it } from "vitest";

import { assignAdminSchema, tenantFormSchema } from "./schema";

const valid = {
  name: "Spa Perrunos y Gatunos",
  slug: "spaperrunosygatunos",
  timezone: "America/Bogota",
  currency: "COP",
};

describe("tenantFormSchema", () => {
  it("acepta un spa válido y normaliza espacios", () => {
    expect(tenantFormSchema.parse({ ...valid, name: "  Spa Demo  " })).toEqual({
      ...valid,
      name: "Spa Demo",
    });
  });

  it("normaliza el subdominio a minúsculas", () => {
    expect(tenantFormSchema.parse({ ...valid, slug: " SpaDemo " }).slug).toBe("spademo");
  });

  it.each([
    ["un subdominio reservado", { slug: "admin" }, "slug"],
    ["un subdominio con guion bajo", { slug: "spa_demo" }, "slug"],
    ["un nombre vacío", { name: "   " }, "name"],
    ["una zona horaria inexistente", { timezone: "America/Narnia" }, "timezone"],
    ["una moneda inválida", { currency: "pesos" }, "currency"],
  ])("rechaza %s", (_, override, field) => {
    const result = tenantFormSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toContain(field);
  });
});

describe("assignAdminSchema", () => {
  it("normaliza el correo", () => {
    expect(assignAdminSchema.parse({ email: "  Ana@Spa.CO " })).toEqual({ email: "ana@spa.co" });
  });

  it("rechaza un correo inválido", () => {
    expect(assignAdminSchema.safeParse({ email: "ana" }).success).toBe(false);
  });
});
