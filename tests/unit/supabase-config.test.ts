import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Los E2E simulan a Google, así que no pasan por la redirección real de Supabase Auth.
// Este test protege la configuración que sí la usa: si falta la allowlist, Supabase ignora
// redirect_to y devuelve al usuario a site_url (un host sin spa → 404).
const config = readFileSync("supabase/config.toml", "utf8");
const setting = (key: string) => new RegExp(`^${key}\\s*=\\s*(.+)$`, "m").exec(config)?.[1];

describe("supabase/config.toml (auth local)", () => {
  it("usa localhost como site_url", () => {
    expect(setting("site_url")).toBe('"http://localhost:3000"');
  });

  it("permite volver al /auth/callback de cualquier subdominio local", () => {
    expect(setting("additional_redirect_urls")).toContain(
      '"http://*.localhost:3000/auth/callback**"',
    );
  });

  it("tiene Google habilitado con credenciales desde el entorno", () => {
    const google = config.slice(config.indexOf("[auth.external.google]"));
    expect(google).toMatch(/enabled = true/);
    expect(google).toMatch(/client_id = "env\(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID\)"/);
    expect(google).toMatch(/secret = "env\(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET\)"/);
  });
});
