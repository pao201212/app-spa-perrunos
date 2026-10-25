import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("parsePublicEnv", () => {
  it("devuelve la configuración cuando las variables son válidas", () => {
    expect(parsePublicEnv(valid)).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "sb_publishable_test",
      cookieDomain: undefined,
    });
  });

  it("acepta un dominio de cookie compartido entre subdominios", () => {
    const env = parsePublicEnv({ ...valid, NEXT_PUBLIC_COOKIE_DOMAIN: ".prismalab.com.co" });
    expect(env.cookieDomain).toBe(".prismalab.com.co");
  });

  it("trata un dominio de cookie vacío como no definido", () => {
    expect(
      parsePublicEnv({ ...valid, NEXT_PUBLIC_COOKIE_DOMAIN: "" }).cookieDomain,
    ).toBeUndefined();
  });

  it("falla con un mensaje que nombra la variable faltante", () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: valid.NEXT_PUBLIC_SUPABASE_URL }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("rechaza una URL de Supabase inválida", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "no-es-url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});
