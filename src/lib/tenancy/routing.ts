import { resolveHost } from "./host";

/** Prefijos internos de las rutas de App Router. Solo se alcanzan vía rewrite del proxy. */
export const TENANT_ROUTE_PREFIX = "/s";
export const PLATFORM_ROUTE_PREFIX = "/platform";

export type IncomingRequest = { host: string; pathname: string; search: string };

export type RouteDecision = { type: "rewrite"; path: string } | { type: "not-found" };

/**
 * Decide a qué ruta interna va una petición según su host.
 * `tenantExists` solo se consulta cuando el host corresponde a un spa.
 */
export async function routeRequest(
  { host, pathname, search }: IncomingRequest,
  rootDomain: string,
  tenantExists: (slug: string) => Promise<boolean>,
): Promise<RouteDecision> {
  const resolution = resolveHost(host, rootDomain);
  const rest = pathname === "/" ? "" : pathname;

  switch (resolution.kind) {
    case "platform":
      return { type: "rewrite", path: `${PLATFORM_ROUTE_PREFIX}${rest}${search}` };
    case "tenant":
      if (!(await tenantExists(resolution.slug))) return { type: "not-found" };
      return { type: "rewrite", path: `${TENANT_ROUTE_PREFIX}/${resolution.slug}${rest}${search}` };
    case "unknown":
      return { type: "not-found" };
  }
}
