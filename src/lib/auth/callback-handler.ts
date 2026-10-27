import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { requestOrigin } from "./origin";
import { LOGIN_PATH, safeNextPath } from "./redirect";
import { ADMIN_PATH, homeFor, tenantOrigin, type HostContext } from "./roles";
import { loadViewer } from "./viewer";

/**
 * Intercambia el código OAuth (PKCE) por una sesión y redirige:
 * a `next` si viene (solo rutas internas) o, si no, al destino según el rol del usuario.
 */
export async function handleAuthCallback(request: NextRequest, context: HostContext) {
  const origin = requestOrigin(request.headers);
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) return NextResponse.redirect(new URL(safeNextPath(next), origin));
      const home = homeFor(context, await loadViewer(supabase, data.user));
      const destination =
        home.type === "path"
          ? new URL(home.path, origin)
          : new URL(ADMIN_PATH, tenantOrigin(origin, home.slug));
      return NextResponse.redirect(destination);
    }
  }

  const failure = new URL(LOGIN_PATH, origin);
  failure.searchParams.set("error", "auth");
  return NextResponse.redirect(failure);
}
