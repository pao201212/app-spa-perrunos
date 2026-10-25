import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/theming/contrast";
import { parseThemeTokens, resolveToken } from "@/lib/theming/tokens";

import { listTenantSlugs } from "../../scripts/sync-tenant-assets";

const TENANTS_DIR = "tenants";
const readTheme = (slug: string) => readFileSync(join(TENANTS_DIR, slug, "theme.css"), "utf8");

const requiredTokens = Object.keys(parseThemeTokens(readTheme("_template")));
const slugs = listTenantSlugs(TENANTS_DIR);

// [texto, fondo, mínimo]: 4.5 para texto normal (AA), 3 para indicadores no textuales.
const CONTRAST_PAIRS: [string, string, number][] = [
  ["--color-text", "--color-bg", 4.5],
  ["--color-text", "--color-surface", 4.5],
  ["--color-text", "--color-surface-muted", 4.5],
  ["--color-text-muted", "--color-bg", 4.5],
  ["--color-text-muted", "--color-surface", 4.5],
  ["--color-primary-contrast", "--color-primary-strong", 4.5],
  ["--color-secondary-contrast", "--color-secondary", 4.5],
  ["--color-primary-strong", "--color-surface", 4.5],
  ["--color-danger", "--color-surface", 4.5],
  ["--color-success", "--color-surface", 4.5],
  ["--color-warning", "--color-surface", 4.5],
  ["--color-focus", "--color-bg", 3],
  ["--color-focus", "--color-surface", 3],
];

describe("contrato de temas", () => {
  it("la plantilla define tokens de marca, color, tipografía y forma", () => {
    expect(requiredTokens).toEqual(
      expect.arrayContaining(["--brand-logo", "--color-primary", "--font-body", "--radius-md"]),
    );
  });

  it("hay al menos dos tenants con tema", () => {
    expect(slugs).toEqual(expect.arrayContaining(["demo", "spaperrunosygatunos"]));
  });

  describe.each(slugs)("%s", (slug) => {
    const tokens = parseThemeTokens(readTheme(slug));

    it("define todos los tokens de la plantilla", () => {
      const missing = requiredTokens.filter((token) => !(token in tokens));
      expect(missing).toEqual([]);
    });

    it.each(CONTRAST_PAIRS)("%s sobre %s cumple el contraste mínimo %d:1", (fg, bg, min) => {
      const ratio = contrastRatio(resolveToken(tokens, fg), resolveToken(tokens, bg));
      expect(ratio).toBeGreaterThanOrEqual(min);
    });
  });
});
