import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { compressImage } from "@/features/customers/compress-image";
import { signOut } from "@/lib/auth/actions";
import { requireCustomer } from "@/lib/auth/customer";
import { getCurrentUser } from "@/lib/auth/session";

import { redirectOf, server, TENANT, withSupabase } from "../server-env";

// Clientes de Supabase, proxy, sesión y utilidades del navegador (con sus dependencias simuladas).

type CookieConfig = {
  cookieOptions?: { domain: string };
  cookies: {
    getAll: () => unknown;
    setAll: (c: { name: string; value: string; options?: object }[]) => void;
  };
};
const ssr = vi.hoisted(() => ({ configs: [] as unknown[], claims: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, config: unknown) => {
    ssr.configs.push(config);
    return { auth: { getClaims: () => ssr.claims(config) } };
  },
  createBrowserClient: (_url: string, _key: string, config: unknown) => ({ browser: true, config }),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => server.supabase.client }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));

beforeEach(() => {
  ssr.configs.length = 0;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pk");
  vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", ".prismalab.test");
});

describe("clientes de Supabase", () => {
  it("el del servidor lee y escribe las cookies de la petición", async () => {
    const { createSupabaseServerClient } =
      await vi.importActual<typeof import("@/lib/supabase/server")>("@/lib/supabase/server");
    server.cookies.set("sb-a", "1");
    await createSupabaseServerClient();
    const config = ssr.configs[0] as CookieConfig;
    expect(config.cookieOptions).toEqual({ domain: ".prismalab.test" });
    expect(config.cookies.getAll()).toEqual([{ name: "sb-a", value: "1" }]);
    config.cookies.setAll([{ name: "sb-b", value: "2" }]);
    expect(server.cookies.get("sb-b")).toBe("2");
  });

  it("desde un Server Component no puede escribir cookies y no falla", async () => {
    const { createSupabaseServerClient } =
      await vi.importActual<typeof import("@/lib/supabase/server")>("@/lib/supabase/server");
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", "");
    const set = vi.spyOn(server.cookies, "set").mockImplementation(() => {
      throw new Error("read-only");
    });
    await createSupabaseServerClient();
    const config = ssr.configs[0] as CookieConfig;
    expect(config.cookieOptions).toBeUndefined();
    expect(() => config.cookies.setAll([{ name: "x", value: "y" }])).not.toThrow();
    set.mockRestore();
  });

  it("el del navegador y el anónimo usan las variables públicas", async () => {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    expect(createSupabaseBrowserClient()).toMatchObject({
      config: { cookieOptions: { domain: ".prismalab.test" } },
    });
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", "");
    expect(createSupabaseBrowserClient()).toMatchObject({ config: { cookieOptions: undefined } });
    const { createSupabaseAnonClient } =
      await vi.importActual<typeof import("@/lib/supabase/anon")>("@/lib/supabase/anon");
    expect(createSupabaseAnonClient()).toBe(server.supabase.client);
  });
});

describe("proxy", () => {
  const request = (url: string, cookie?: string) =>
    new NextRequest(url, { headers: { host: new URL(url).host, ...(cookie && { cookie }) } });

  it("reescribe al spa y responde 404 a subdominios desconocidos", async () => {
    const { proxy, config } = await import("@/proxy");
    expect(config.matcher[0]).toContain("tenants/");
    const ok = await proxy(request("http://spa.localhost:3000/reservar"));
    expect(ok.headers.get("x-middleware-rewrite")).toBe("http://spa.localhost:3000/s/spa/reservar");
    server.tenant = null;
    const missing = await proxy(request("http://nadie.localhost:3000/"));
    expect(missing.status).toBe(404);
  });

  it("refresca la sesión solo si hay cookie de Supabase", async () => {
    const { withRefreshedSession } = await import("@/lib/supabase/proxy");
    const make = vi.fn(() => NextResponse.next());
    await withRefreshedSession(request("http://spa.localhost:3000/"), make);
    expect(ssr.configs).toHaveLength(0);

    ssr.claims.mockImplementationOnce(async (config: CookieConfig) => {
      expect(config.cookies.getAll()).toEqual([{ name: "sb-token", value: "old" }]);
      config.cookies.setAll([{ name: "sb-token", value: "new", options: { path: "/" } }]);
    });
    const response = await withRefreshedSession(
      request("http://spa.localhost:3000/", "sb-token=old"),
      make,
    );
    expect(response.cookies.get("sb-token")?.value).toBe("new");
    expect(make).toHaveBeenCalledTimes(3);
    vi.stubEnv("NEXT_PUBLIC_COOKIE_DOMAIN", "");
    await withRefreshedSession(request("http://spa.localhost:3000/", "sb-token=old"), make);
    expect((ssr.configs.at(-1) as CookieConfig).cookieOptions).toBeUndefined();
  });
});

describe("sesión y perfil", () => {
  it("getCurrentUser y signOut", async () => {
    const fake = withSupabase({ user: { id: "u", email: "ana@spa.test" } });
    expect(await getCurrentUser()).toEqual({ id: "u", email: "ana@spa.test" });
    expect(await redirectOf(() => signOut())).toBe("/ingresar");
    expect(fake.client.auth.signOut).toHaveBeenCalled();
  });

  it("vincula al vuelo el perfil inscrito por el admin con el correo de la cuenta", async () => {
    withSupabase({
      rpcs: { claim_customer_profile: { data: "c1", error: null } },
      tables: {
        customers: (ops) =>
          ops.some((o) => o.method === "match")
            ? { data: null, error: null }
            : { data: { id: "c1", full_name: "Ana" }, error: null },
      },
    });
    expect((await requireCustomer("spa", "/citas")).customer).toEqual({
      id: "c1",
      full_name: "Ana",
    });
    withSupabase({
      rpcs: { claim_customer_profile: { data: "c1", error: null } },
      tables: {
        customers: (ops) => ({
          data: null,
          error: ops.some((o) => o.method === "eq") ? { message: "x" } : null,
        }),
      },
    });
    await expect(requireCustomer("spa", "/citas")).rejects.toMatchObject({ message: "x" });
  });

  it("el tenant de la petición se busca con anon y su error se explica", async () => {
    const { fetchActiveTenant } =
      await vi.importActual<typeof import("@/lib/tenancy/tenants")>("@/lib/tenancy/tenants");
    withSupabase({ dataset: { tenants: [TENANT] } });
    expect(await fetchActiveTenant("spa")).toEqual(TENANT);
    withSupabase({ tables: { tenants: { data: null, error: { message: "caída" } } } });
    await expect(fetchActiveTenant("spa")).rejects.toThrow(
      'No se pudo consultar el tenant "spa": caída',
    );
  });

  it("loadViewer y getViewer leen roles con la sesión del usuario", async () => {
    const viewer = await vi.importActual<typeof import("@/lib/auth/viewer")>("@/lib/auth/viewer");
    const fake = withSupabase({
      user: { id: "u", email: "ana@spa.test" },
      tables: {
        platform_admins: { data: { user_id: "u" }, error: null },
        memberships: {
          data: [
            { tenants: { slug: "b", name: "Spa B", is_active: true } },
            { tenants: { slug: "a", name: "Spa A", is_active: true } },
            { tenants: { slug: "z", name: "Cerrado", is_active: false } },
          ],
          error: null,
        },
      },
    });
    const user = { id: "u", email: "ana@spa.test", user_metadata: { name: "Ana" } } as never;
    expect(await viewer.loadViewer(fake.client as never, user)).toEqual({
      userId: "u",
      email: "ana@spa.test",
      name: "Ana",
      isSuperAdmin: true,
      tenants: [
        { slug: "a", name: "Spa A" },
        { slug: "b", name: "Spa B" },
      ],
    });
    expect(await viewer.getViewer()).toMatchObject({ userId: "u" });
    withSupabase({ tables: { platform_admins: { data: null, error: { message: "pa" } } } });
    await expect(viewer.loadViewer(server.supabase.client as never, user)).rejects.toMatchObject({
      message: "pa",
    });
    withSupabase({ tables: { memberships: { data: null, error: { message: "m" } } } });
    await expect(viewer.loadViewer(server.supabase.client as never, user)).rejects.toMatchObject({
      message: "m",
    });
  });
});

describe("compressImage", () => {
  const photo = (type = "image/jpeg", size = 5000) =>
    new File([new Uint8Array(size)], "foto.jpg", { type });

  it("deja igual lo que no es imagen o si el navegador no puede procesarla", async () => {
    const text = photo("text/plain");
    expect(await compressImage(text)).toBe(text);
    const image = photo();
    expect(await compressImage(image)).toBe(image); // jsdom no tiene createImageBitmap
  });

  it("reduce a WebP cuando el resultado pesa menos", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", async () => ({ width: 3200, height: 1600, close }));
    const canvas = document.createElement("canvas");
    const sizes = [100, 99999];
    canvas.toBlob = (done: BlobCallback) => done(new Blob([new Uint8Array(sizes.shift() ?? 0)]));
    vi.spyOn(canvas, "getContext").mockReturnValue(null);
    vi.spyOn(document, "createElement").mockReturnValue(canvas);
    const small = await compressImage(photo());
    expect(small).toMatchObject({ name: "foto.webp", type: "image/webp" });
    expect(canvas.width).toBe(1600);
    const original = photo();
    expect(await compressImage(original)).toBe(original); // el WebP pesaría más
    vi.stubGlobal("createImageBitmap", async () => {
      throw new Error("formato");
    });
    expect(await compressImage(original)).toBe(original);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
