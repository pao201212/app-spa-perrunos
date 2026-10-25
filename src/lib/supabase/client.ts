import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/db/types";
import { getPublicEnv } from "@/lib/env";

/** Cliente de Supabase para Client Components. Usa la misma cookie de sesión que el servidor. */
export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabasePublishableKey, cookieDomain } = getPublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
  });
}
