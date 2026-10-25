import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { requestOrigin } from "./origin";
import { LOGIN_PATH, safeNextPath } from "./redirect";

/** Intercambia el código OAuth (PKCE) por una sesión y vuelve a una ruta interna del mismo host. */
export async function handleAuthCallback(request: NextRequest) {
  const origin = requestOrigin(request.headers);
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const failure = new URL(LOGIN_PATH, origin);
  failure.searchParams.set("error", "auth");
  return NextResponse.redirect(failure);
}
