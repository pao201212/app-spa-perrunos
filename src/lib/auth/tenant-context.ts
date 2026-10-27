import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { requireTenantStaff } from "./guards";

/** Para Server Actions del panel: verifica staff del spa y devuelve el tenant y el cliente con sesión. */
export async function tenantStaffContext(slug: string, path: string) {
  const { tenant, viewer } = await requireTenantStaff(slug, path);
  const supabase = await createSupabaseServerClient();
  return { tenant, viewer, supabase };
}
