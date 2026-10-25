import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { getPublicEnv } from "@/lib/env";

/**
 * Refresca la sesión de Supabase en el proxy, antes de renderizar.
 * `makeResponse` recrea la respuesta (rewrite) para que las páginas lean las cookies actualizadas.
 */
export async function withRefreshedSession(
  request: NextRequest,
  makeResponse: () => NextResponse,
): Promise<NextResponse> {
  let response = makeResponse();
  const hasAuthCookie = request.cookies.getAll().some(({ name }) => name.startsWith("sb-"));
  if (!hasAuthCookie) return response;

  const { supabaseUrl, supabasePublishableKey, cookieDomain } = getPublicEnv();
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = makeResponse();
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options);
      },
    },
  });

  // Valida el JWT y, si expiró, lo renueva escribiendo las cookies nuevas.
  await supabase.auth.getClaims();
  return response;
}
