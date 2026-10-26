import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listLocations(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, address, is_active")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function countLocations(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return count ?? 0;
}

export async function getLocationDetail(tenantId: string, locationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .select(
      `id, name, address, whatsapp, is_active, confirmation_mode, cancel_window_hours, max_days_ahead,
       slot_step_min, bather_continues_drying,
       stations (id, name, kind, for_special_cut, sort_order),
       location_hours (id, weekday, opens_at, closes_at),
       location_closures (id, date, reason)`,
    )
    .eq("tenant_id", tenantId)
    .eq("id", locationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type LocationDetail = NonNullable<Awaited<ReturnType<typeof getLocationDetail>>>;
