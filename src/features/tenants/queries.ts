import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Lecturas con la sesión del super admin: RLS le da acceso a todos los spas (incluso inactivos).

export async function listTenants() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug, name, is_active, timezone, currency")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getTenantBySlugForConsole(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug, name, is_active, timezone, currency")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTenantStaff(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("tenant_staff", { p_tenant_id: tenantId });
  if (error) throw error;
  return data;
}
