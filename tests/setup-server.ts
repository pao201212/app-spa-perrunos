import { beforeEach, vi } from "vitest";

import { NotFoundError, RedirectError, resetServer, router, server } from "./server-env";

// Módulos de Next y de la app que dependen del servidor, simulados para todas las pruebas unitarias.
// Cada archivo puede sobrescribirlos con su propio vi.mock.

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new RedirectError(path);
  },
  permanentRedirect: (path: string) => {
    throw new RedirectError(path);
  },
  notFound: () => {
    throw new NotFoundError();
  },
  usePathname: () => server.pathname,
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(server.search),
}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => server.headers,
  cookies: async () => ({
    getAll: () => [...server.cookies].map(([name, value]) => ({ name, value })),
    get: (name: string) =>
      server.cookies.has(name) ? { name, value: server.cookies.get(name) } : undefined,
    set: (name: string, value: string) => server.cookies.set(name, value),
    delete: (name: string) => server.cookies.delete(name),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => server.supabase.client,
}));
vi.mock("@/lib/supabase/anon", () => ({
  createSupabaseAnonClient: () => server.supabase.client,
}));
vi.mock("@/lib/auth/viewer", () => ({
  getViewer: async () => server.viewer,
  loadViewer: vi.fn(),
}));
vi.mock("@/lib/tenancy/tenants", () => ({
  fetchActiveTenant: async () => server.tenant,
}));

beforeEach(() => {
  resetServer();
  vi.clearAllMocks();
});
