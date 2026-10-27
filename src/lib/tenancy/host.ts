// Resolución host → tenant. Mantener sincronizado con los CHECK de public.tenants.slug
// (supabase/migrations/*_tenancy.sql).

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;

export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  "admin",
  "www",
  "api",
  "app",
  "auth",
  "platform",
  "static",
  "assets",
]);

export const PLATFORM_SUBDOMAIN = "admin";

export type HostResolution =
  { kind: "tenant"; slug: string } | { kind: "platform" } | { kind: "unknown" };

export function isValidTenantSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SUBDOMAINS.has(slug);
}

/**
 * Traduce el header Host a un tenant o a la consola de plataforma.
 * Solo se acepta un nivel de subdominio sobre `rootDomain` (sin `www.` delante de un spa).
 */
export function resolveHost(host: string, rootDomain: string): HostResolution {
  const hostname = host.trim().toLowerCase().replace(/:\d+$/, "");
  const suffix = `.${rootDomain.toLowerCase()}`;
  if (!hostname.endsWith(suffix)) return { kind: "unknown" };

  const subdomain = hostname.slice(0, -suffix.length);
  if (subdomain === PLATFORM_SUBDOMAIN) return { kind: "platform" };
  if (subdomain.includes(".") || !isValidTenantSlug(subdomain)) return { kind: "unknown" };

  return { kind: "tenant", slug: subdomain };
}
