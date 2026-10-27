import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { getPublicEnv } from "@/lib/env";

/**
 * Cliente sin sesión (rol anon): solo ve lo público por RLS. Al no leer cookies se puede usar
 * dentro de `use cache` y en el proxy.
 */
export function createSupabaseAnonClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
