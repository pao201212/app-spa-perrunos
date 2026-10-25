// Copia tenants/{slug}/ (theme.css + assets/) a public/tenants/{slug}/ para servirlos estáticos.
// Se ejecuta antes de `dev` y `build`. Uso: node scripts/sync-tenant-assets.ts
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/** Tenants publicables: carpetas con theme.css. Las que empiezan con "_" (plantilla) se omiten. */
export function listTenantSlugs(tenantsDir: string): string[] {
  return readdirSync(tenantsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .filter((slug) => existsSync(join(tenantsDir, slug, "theme.css")))
    .sort();
}

export function syncTenantAssets(tenantsDir: string, outDir: string): string[] {
  rmSync(outDir, { recursive: true, force: true });
  const slugs = listTenantSlugs(tenantsDir);
  for (const slug of slugs) {
    cpSync(join(tenantsDir, slug), join(outDir, slug), { recursive: true });
  }
  return slugs;
}

if (import.meta.main) {
  const slugs = syncTenantAssets("tenants", join("public", "tenants"));
  console.log(`Temas sincronizados: ${slugs.join(", ")}`);
}
