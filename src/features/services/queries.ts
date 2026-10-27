import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listCategories(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_categories")
    .select("id, name, sort_order")
    .eq("tenant_id", tenantId)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data;
}

/** Servicios del spa (incluidos los inactivos) con su categoría y número de extras. */
export async function listServices(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, kind, species, is_active, category_id, service_categories (name), extras (count)",
    )
    .eq("tenant_id", tenantId)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data.map(({ extras, ...service }) => ({ ...service, extraCount: extras[0]?.count ?? 0 }));
}

export async function getService(tenantId: string, serviceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, kind, species, description, is_active, category_id, extras (id, name, extra_minutes, is_active), service_options (id, name, stage, sort_order)",
    )
    .match({ tenant_id: tenantId, id: serviceId })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type Category = Awaited<ReturnType<typeof listCategories>>[number];
export type ServiceSummary = Awaited<ReturnType<typeof listServices>>[number];
export type ServiceDetail = NonNullable<Awaited<ReturnType<typeof getService>>>;

export async function getServiceDurations(serviceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_durations")
    .select("size, coat, bath_min, dry_min, details_min, cut_min")
    .eq("service_id", serviceId);
  if (error) throw error;
  return data;
}

export type ServiceDuration = Awaited<ReturnType<typeof getServiceDurations>>[number];

/** Precios del servicio y de sus extras en un local. */
export async function getLocationPrices(locationId: string, serviceId: string) {
  const supabase = await createSupabaseServerClient();
  const [service, extras] = await Promise.all([
    supabase
      .from("location_service_prices")
      .select("size, coat, price_cop")
      .match({ location_id: locationId, service_id: serviceId }),
    supabase
      .from("location_extra_prices")
      .select("extra_id, size, coat, price_cop, extras!inner (service_id)")
      .eq("location_id", locationId)
      .eq("extras.service_id", serviceId),
  ]);
  if (service.error) throw service.error;
  if (extras.error) throw extras.error;
  return {
    service: service.data,
    extras: extras.data.map(({ extra_id, size, coat, price_cop }) => ({
      extra_id,
      size,
      coat,
      price_cop,
    })),
  };
}

export type LocationPrices = Awaited<ReturnType<typeof getLocationPrices>>;
