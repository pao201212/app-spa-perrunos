import { NextResponse, type NextRequest } from "next/server";

import { withRefreshedSession } from "@/lib/supabase/proxy";
import { getRootDomain } from "@/lib/tenancy/config";
import { routeRequest } from "@/lib/tenancy/routing";
import { fetchActiveTenant } from "@/lib/tenancy/tenants";

// Caché best-effort por instancia para no consultar la BD en cada navegación.
const EXISTS_TTL_MS = 60_000;
const existsCache = new Map<string, { exists: boolean; expiresAt: number }>();

async function tenantExists(slug: string): Promise<boolean> {
  const cached = existsCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.exists;
  const exists = (await fetchActiveTenant(slug)) !== null;
  existsCache.set(slug, { exists, expiresAt: Date.now() + EXISTS_TTL_MS });
  return exists;
}

export async function proxy(request: NextRequest) {
  const decision = await routeRequest(
    {
      host: request.headers.get("host") ?? "",
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
    },
    getRootDomain(),
    tenantExists,
  );

  if (decision.type === "not-found") {
    // Ruta inexistente → app/not-found.tsx con estado 404 antes de empezar a transmitir.
    return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
  }
  const destination = new URL(decision.path, request.url);
  return withRefreshedSession(request, () =>
    NextResponse.rewrite(destination, { request: { headers: request.headers } }),
  );
}

export const config = {
  // Excluye todo /_next (estáticos, imágenes, HMR) y los assets públicos de los temas.
  matcher: ["/((?!_next/|favicon.ico|tenants/|api/health).*)"],
};
