import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import type { Database } from "@/lib/db/types";
import { getPublicEnv } from "@/lib/env";

/** Cliente de Supabase con la sesión del usuario actual (RLS aplica). */
export async function createSupabaseServerClient() {
  // La sesión es siempre dato de la petición: nunca se prerenderiza ni se prefetchea.
  await connection();
  const { supabaseUrl, supabasePublishableKey, cookieDomain } = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Llamado desde un Server Component: no puede escribir cookies.
          // El proxy refresca la sesión en cada navegación.
        }
      },
    },
  });
}
