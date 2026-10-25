import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { getPublicEnv } from "@/lib/env";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  currency: string;
};

/**
 * Busca un tenant activo por slug con el rol `anon` (RLS: solo tenants activos).
 * Sin cookies: se puede usar en el proxy y dentro de `use cache`.
 */
export async function fetchActiveTenant(slug: string): Promise<Tenant | null> {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug, name, timezone, currency")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar el tenant "${slug}": ${error.message}`);
  return data;
}
