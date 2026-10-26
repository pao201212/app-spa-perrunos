import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const BREED_COLUMNS =
  "id, global_breed_id, species, name, size, coat, is_mixed, is_customized, is_active";

/** Todas las razas del spa, incluidas las ocultas (el staff las ve por RLS). */
export async function listTenantBreeds(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_breeds")
    .select(BREED_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getTenantBreed(tenantId: string, breedId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_breeds")
    .select(BREED_COLUMNS)
    .match({ tenant_id: tenantId, id: breedId })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSizeThresholds(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("size_thresholds")
    .select("species, size, max_kg")
    .eq("tenant_id", tenantId)
    .order("max_kg");
  if (error) throw error;
  return data;
}

export type TenantBreed = Awaited<ReturnType<typeof listTenantBreeds>>[number];
export type SizeThreshold = Awaited<ReturnType<typeof getSizeThresholds>>[number];
