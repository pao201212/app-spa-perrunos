import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/tenancy/get-tenant";

import { requireViewer } from "./guards";

export const PROFILE_PATH = "/perfil";

/** Perfil de cliente del usuario actual en el spa (null si aún no lo completa). */
export async function getOwnCustomer(tenantId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, whatsapp, email")
    .match({ tenant_id: tenantId, user_id: userId })
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Exige sesión y perfil de cliente en el spa; sin perfil, lo manda a completarlo. */
export async function requireCustomer(slug: string, next: string) {
  const viewer = await requireViewer(next);
  const tenant = await getTenant(slug);
  const customer = await getOwnCustomer(tenant.id, viewer.userId);
  if (!customer) redirect(`${PROFILE_PATH}?next=${encodeURIComponent(next)}`);
  const supabase = await createSupabaseServerClient();
  return { viewer, tenant, customer, supabase };
}
