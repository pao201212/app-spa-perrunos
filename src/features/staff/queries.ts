import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listStaff(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, is_active, staff_skills (skill)")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getStaffDetail(tenantId: string, staffId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff")
    .select(
      `id, name, is_active,
       staff_skills (skill),
       staff_shifts (id, weekday, starts_at, ends_at, location_id, locations (name)),
       staff_absences (id, starts_at, ends_at, reason)`,
    )
    .match({ tenant_id: tenantId, id: staffId })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type StaffDetail = NonNullable<Awaited<ReturnType<typeof getStaffDetail>>>;
