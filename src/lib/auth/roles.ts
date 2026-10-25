// Reglas de navegación por rol (SPEC HU-A1). Lógica pura: la autorización real la aplica RLS.

export type ViewerTenant = { slug: string; name: string };

export type Viewer = {
  userId: string;
  email: string | undefined;
  isSuperAdmin: boolean;
  /** Spas donde el usuario es staff (membresía activa). */
  tenants: ViewerTenant[];
};

export type HostContext = { kind: "platform" } | { kind: "tenant"; slug: string };

export type Home = { type: "path"; path: string } | { type: "tenant-admin"; slug: string };

export const ADMIN_PATH = "/admin";
export const NO_ACCESS_PATH = "/sin-acceso";
export const CHOOSE_TENANT_PATH = "/elegir";

export function canManageTenant(viewer: Viewer | null, slug: string): boolean {
  return !!viewer && (viewer.isSuperAdmin || viewer.tenants.some((t) => t.slug === slug));
}

/** A dónde va un usuario recién autenticado según el host donde está. */
export function homeFor(context: HostContext, viewer: Viewer): Home {
  if (context.kind === "tenant") {
    return { type: "path", path: canManageTenant(viewer, context.slug) ? ADMIN_PATH : "/" };
  }
  if (viewer.isSuperAdmin) return { type: "path", path: "/" };
  if (viewer.tenants.length === 1) return { type: "tenant-admin", slug: viewer.tenants[0].slug };
  if (viewer.tenants.length > 1) return { type: "path", path: CHOOSE_TENANT_PATH };
  return { type: "path", path: NO_ACCESS_PATH };
}

/** Origen del spa `slug` a partir del origen de la consola (mismo protocolo, dominio y puerto). */
export function tenantOrigin(platformOrigin: string, slug: string): string {
  const url = new URL(platformOrigin);
  url.hostname = [slug, ...url.hostname.split(".").slice(1)].join(".");
  return url.origin;
}
