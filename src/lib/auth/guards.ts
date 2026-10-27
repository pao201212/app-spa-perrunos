import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getTenant } from "@/lib/tenancy/get-tenant";

import { requestOrigin } from "./origin";
import { LOGIN_PATH } from "./redirect";
import {
  ADMIN_PATH,
  canManageTenant,
  homeFor,
  NO_ACCESS_PATH,
  tenantOrigin,
  type Viewer,
} from "./roles";
import { getViewer } from "./viewer";

// Los guards controlan la navegación; la autorización real de los datos la hace RLS.

/** Exige sesión. Sin sesión redirige a /ingresar recordando `next`. */
export async function requireViewer(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`${LOGIN_PATH}?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Exige ser staff del spa (o super admin). */
export async function requireTenantStaff(slug: string, next: string) {
  const viewer = await requireViewer(next);
  if (!canManageTenant(viewer, slug)) redirect(NO_ACCESS_PATH);
  const tenant = await getTenant(slug);
  return { viewer, tenant };
}

/** Exige ser super admin; los demás van a su destino según rol. */
export async function requireSuperAdmin(next: string): Promise<Viewer> {
  const viewer = await requireViewer(next);
  if (viewer.isSuperAdmin) return viewer;

  const home = homeFor({ kind: "platform" }, viewer);
  if (home.type === "path") redirect(home.path);
  redirect(`${tenantOrigin(requestOrigin(await headers()), home.slug)}${ADMIN_PATH}`);
}
