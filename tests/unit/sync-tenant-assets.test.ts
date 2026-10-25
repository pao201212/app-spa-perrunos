import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { listTenantSlugs, syncTenantAssets } from "../../scripts/sync-tenant-assets";

let src: string;
let out: string;

function writeTenant(slug: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    const full = join(src, slug, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
}

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), "tenants-"));
  src = join(root, "tenants");
  out = join(root, "public", "tenants");
  writeTenant("_template", { "theme.css": ":root{}" });
  writeTenant("demo", { "theme.css": ":root{--a:1}", "assets/logo.svg": "<svg/>" });
  writeTenant("sin-tema", { "assets/logo.svg": "<svg/>" });
});

describe("listTenantSlugs", () => {
  it("lista los tenants con theme.css y omite la plantilla", () => {
    expect(listTenantSlugs(src)).toEqual(["demo"]);
  });
});

describe("syncTenantAssets", () => {
  it("copia el tema y los assets de cada tenant", () => {
    syncTenantAssets(src, out);
    expect(readFileSync(join(out, "demo", "theme.css"), "utf8")).toBe(":root{--a:1}");
    expect(existsSync(join(out, "demo", "assets", "logo.svg"))).toBe(true);
    expect(existsSync(join(out, "_template"))).toBe(false);
    expect(existsSync(join(out, "sin-tema"))).toBe(false);
  });

  it("elimina archivos obsoletos de una sincronización anterior", () => {
    mkdirSync(join(out, "viejo"), { recursive: true });
    writeFileSync(join(out, "viejo", "theme.css"), "");
    syncTenantAssets(src, out);
    expect(existsSync(join(out, "viejo"))).toBe(false);
  });
});
