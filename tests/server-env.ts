import { vi } from "vitest";

import type { Viewer } from "@/lib/auth/roles";
import type { Tenant } from "@/lib/tenancy/tenants";

import { fakeSupabase } from "./supabase-fake";

// Entorno de servidor simulado para pruebas unitarias (tests/setup-server.ts lo conecta con
// vi.mock): sesión, tenant, cabeceras y Supabase que cada prueba ajusta.

export class RedirectError extends Error {
  constructor(public path: string) {
    super(`redirect:${path}`);
  }
}
export class NotFoundError extends Error {
  constructor() {
    super("not-found");
  }
}

export const TENANT: Tenant = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "spa",
  name: "Spa Prueba",
  timezone: "America/Bogota",
  currency: "COP",
};

export const STAFF: Viewer = {
  userId: "00000000-0000-4000-8000-0000000000aa",
  email: "admin@spa.test",
  name: "Admin",
  isSuperAdmin: false,
  tenants: [{ slug: "spa", name: "Spa Prueba" }],
};

export const CUSTOMER: Viewer = { ...STAFF, email: "cliente@spa.test", name: "Ana", tenants: [] };
export const SUPER_ADMIN: Viewer = { ...STAFF, isSuperAdmin: true, tenants: [] };

export const server = {
  supabase: fakeSupabase(),
  viewer: STAFF as Viewer | null,
  tenant: TENANT as Tenant | null,
  headers: new Headers({ host: "spa.localhost:3000" }),
  cookies: new Map<string, string>(),
  pathname: "/",
  search: "",
};

export function resetServer() {
  server.supabase = fakeSupabase();
  server.viewer = STAFF;
  server.tenant = TENANT;
  server.headers = new Headers({ host: "spa.localhost:3000" });
  server.cookies = new Map();
  server.pathname = "/";
  server.search = "";
}

/** Usa un Supabase con estas tablas y RPCs y lo devuelve (para revisar llamadas). */
export function withSupabase(...args: Parameters<typeof fakeSupabase>) {
  server.supabase = fakeSupabase(...args);
  return server.supabase;
}

export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
};

/** Ejecuta y devuelve la ruta a la que redirige (o falla si no redirige). */
export async function redirectOf(run: () => unknown): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof RedirectError) return error.path;
    throw error;
  }
  throw new Error("No redirigió");
}

/** Estado inicial de useActionState. */
export const IDLE = { status: "idle" as const };
/** Errores de Postgres típicos para las ramas de error de las acciones. */
export const UNIQUE = { code: "23505" };
export const FAIL = { code: "XX000" };

/** FormData a partir de un objeto (los arreglos se agregan como valores repetidos). */
export function form(entries: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries))
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  return data;
}
