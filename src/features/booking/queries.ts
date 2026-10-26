import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { BookingCatalog } from "./pricing";

/** Lo que el cliente puede reservar en el spa: servicios activos, opcionales, locales y precios. */
export async function getBookingCatalog(tenantId: string): Promise<BookingCatalog> {
  const supabase = await createSupabaseServerClient();
  const [services, extras, options, locations, servicePrices, extraPrices] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, kind, species, description")
      .match({ tenant_id: tenantId, is_active: true })
      .order("sort_order")
      .order("name"),
    supabase
      .from("extras")
      .select("id, service_id, name, extra_minutes")
      .match({ tenant_id: tenantId, is_active: true })
      .order("name"),
    supabase
      .from("service_options")
      .select("id, service_id, name, stage")
      .match({ tenant_id: tenantId, is_active: true })
      .order("sort_order")
      .order("name"),
    supabase
      .from("locations")
      .select("id, name, address, max_days_ahead")
      .match({ tenant_id: tenantId, is_active: true })
      .order("name"),
    supabase
      .from("location_service_prices")
      .select("location_id, service_id, size, coat, price_cop")
      .eq("tenant_id", tenantId),
    supabase
      .from("location_extra_prices")
      .select("location_id, extra_id, size, coat, price_cop")
      .eq("tenant_id", tenantId),
  ]);
  for (const result of [services, extras, options, locations, servicePrices, extraPrices])
    if (result.error) throw result.error;
  return {
    services: services.data ?? [],
    extras: extras.data ?? [],
    options: options.data ?? [],
    locations: locations.data ?? [],
    servicePrices: servicePrices.data ?? [],
    extraPrices: extraPrices.data ?? [],
  };
}
