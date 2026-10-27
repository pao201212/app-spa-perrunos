import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

import { fetchActiveTenant, type Tenant } from "./tenants";

export const tenantCacheTag = (slug: string) => `tenant:${slug}`;

/** Tenant activo para renderizar páginas. Cacheado; se invalida con `tenantCacheTag(slug)`. */
export async function getTenant(slug: string): Promise<Tenant> {
  "use cache";
  cacheLife("minutes");
  cacheTag(tenantCacheTag(slug));

  const tenant = await fetchActiveTenant(slug);
  if (!tenant) notFound();
  return tenant;
}
