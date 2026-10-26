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

async function getCustomerById(customerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, whatsapp, email")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Exige sesión y perfil de cliente en el spa. Si el admin lo inscribió con el correo de su
 * cuenta, lo vincula al vuelo (D13); si no hay perfil, lo manda a completarlo.
 */
export async function requireCustomer(slug: string, next: string) {
  const viewer = await requireViewer(next);
  const tenant = await getTenant(slug);
  const supabase = await createSupabaseServerClient();

  let customer = await getOwnCustomer(tenant.id, viewer.userId);
  if (!customer) {
    const { data: claimed } = await supabase.rpc("claim_customer_profile", {
      p_tenant_id: tenant.id,
    });
    // Se lee por id: repetir la misma consulta devolvería el resultado memoizado (null), porque
    // Next memoiza los fetch GET idénticos dentro de un mismo render.
    if (claimed) customer = await getCustomerById(claimed);
  }
  if (!customer) redirect(`${PROFILE_PATH}?next=${encodeURIComponent(next)}`);
  return { viewer, tenant, customer, supabase };
}
