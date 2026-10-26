import { cacheLife, cacheTag } from "next/cache";

import { createSupabaseAnonClient } from "@/lib/supabase/anon";

// Catálogo público: se cachea unos minutos por spa. Lo administrativo se ve al instante en el
// panel; la vista pública puede tardar hasta que expire la caché.
export const catalogCacheTag = (tenantId: string) => `catalog:${tenantId}`;

export async function getPublicLocations(tenantId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(catalogCacheTag(tenantId));

  const { data, error } = await createSupabaseAnonClient()
    .from("locations")
    .select("id, name, address, whatsapp, location_hours (weekday, opens_at, closes_at)")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data;
}

/** Servicios que el local ofrece (tienen precio ahí), con su precio mínimo y sus extras. */
export async function getPublicCatalog(tenantId: string, locationId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(catalogCacheTag(tenantId));

  const supabase = createSupabaseAnonClient();
  const [services, servicePrices, extraPrices] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id, name, kind, species, description, sort_order, service_categories (name, sort_order), extras (id, name, is_active)",
      )
      .eq("tenant_id", tenantId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("location_service_prices")
      .select("service_id, price_cop")
      .eq("location_id", locationId),
    supabase
      .from("location_extra_prices")
      .select("extra_id, price_cop")
      .eq("location_id", locationId),
  ]);
  for (const result of [services, servicePrices, extraPrices]) if (result.error) throw result.error;

  const minBy = <T extends { price_cop: number }>(rows: T[], key: (row: T) => string) => {
    const mins = new Map<string, number>();
    for (const row of rows)
      mins.set(key(row), Math.min(mins.get(key(row)) ?? Infinity, row.price_cop));
    return mins;
  };
  const serviceMin = minBy(servicePrices.data ?? [], (row) => row.service_id);
  const extraMin = minBy(extraPrices.data ?? [], (row) => row.extra_id);

  return (services.data ?? [])
    .filter((service) => serviceMin.has(service.id))
    .map((service) => ({
      id: service.id,
      name: service.name,
      kind: service.kind,
      species: service.species,
      description: service.description,
      category: service.service_categories?.name ?? "Otros servicios",
      categoryOrder: service.service_categories?.sort_order ?? 999,
      fromPrice: serviceMin.get(service.id)!,
      extras: service.extras
        .filter((extra) => extra.is_active && extraMin.has(extra.id))
        .map((extra) => ({ id: extra.id, name: extra.name, fromPrice: extraMin.get(extra.id)! })),
    }));
}

export type PublicLocation = Awaited<ReturnType<typeof getPublicLocations>>[number];
export type PublicService = Awaited<ReturnType<typeof getPublicCatalog>>[number];
