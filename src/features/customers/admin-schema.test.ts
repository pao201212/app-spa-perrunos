import { describe, expect, it } from "vitest";

import { adminCustomerSchema, petOverrideSchema, sanitizeSearch } from "./admin-schema";

describe("sanitizeSearch", () => {
  it("recorta y conserva texto, números y signos de teléfono o correo", () => {
    expect(sanitizeSearch("  Ana Pérez ")).toBe("Ana Pérez");
    expect(sanitizeSearch("+57 300-123")).toBe("+57 300-123");
    expect(sanitizeSearch("ana@spa.co")).toBe("ana@spa.co");
  });

  it("elimina los caracteres con significado en los filtros de PostgREST", () => {
    expect(sanitizeSearch("ana,user_id.eq.x)")).toBe("anauser_id.eq.x");
    expect(sanitizeSearch('a%b*c"d\\e')).toBe("abcde");
  });

  it("devuelve vacío si no queda nada útil", () => {
    expect(sanitizeSearch(" ,() ")).toBe("");
    expect(sanitizeSearch(undefined)).toBe("");
  });
});

describe("adminCustomerSchema", () => {
  it("exige nombre y WhatsApp; el correo es opcional y se normaliza", () => {
    expect(
      adminCustomerSchema.parse({
        full_name: " Carlos ",
        whatsapp: "+57 300 123 4567",
        email: " Carlos@Mail.CO ",
      }),
    ).toEqual({
      full_name: "Carlos",
      whatsapp: "+57 300 123 4567",
      email: "carlos@mail.co",
    });
    expect(
      adminCustomerSchema.parse({ full_name: "Carlos", whatsapp: "3001234567", email: "" }).email,
    ).toBeNull();
    expect(
      adminCustomerSchema
        .safeParse({ full_name: "Carlos", whatsapp: "x", email: "no" })
        .error?.issues.map((i) => i.path[0])
        .sort(),
    ).toEqual(["email", "whatsapp"]);
  });
});

describe("petOverrideSchema", () => {
  it("lee la fijación manual de talla y pelo", () => {
    expect(petOverrideSchema.parse({ size_locked: "on", size: "XL", coat: "short" })).toEqual({
      size_locked: true,
      size: "XL",
      coat: "short",
    });
    expect(petOverrideSchema.parse({})).toEqual({
      size_locked: false,
      size: undefined,
      coat: undefined,
    });
  });
});
