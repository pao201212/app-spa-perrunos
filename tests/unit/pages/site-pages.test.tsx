import { screen } from "@testing-library/react";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { loadViewer } from "@/lib/auth/viewer";

import { dataset, IDS } from "../../fixtures/dataset";
import { pageProps, renderServer } from "../../render-server";
import {
  CUSTOMER,
  NotFoundError,
  redirectOf,
  server,
  SUPER_ADMIN,
  TENANT,
  withSupabase,
} from "../../server-env";

// Páginas del cliente, públicas y de la consola de Prisma Lab, layouts y rutas.

const slug = "spa";
type Load = () => Promise<{ default: (props: never) => unknown }>;
const h1 = () => screen.getByRole("heading", { level: 1 });

async function show(load: Load, params: object = {}, search: object = {}) {
  const { default: Page } = await load();
  return renderServer(Page(pageProps(params, search)));
}

describe("páginas del cliente", () => {
  it.each([
    ["mis mascotas", () => import("@/app/s/[slug]/mascotas/page"), { slug }, {}, /Mis mascotas/],
    [
      "mascota",
      () => import("@/app/s/[slug]/mascotas/[id]/page"),
      { slug, id: IDS.pet },
      {},
      /Rocky/,
    ],
    [
      "mascota nueva",
      () => import("@/app/s/[slug]/mascotas/nueva/page"),
      { slug },
      {},
      /Nueva mascota/,
    ],
    [
      "perfil",
      () => import("@/app/s/[slug]/perfil/page"),
      { slug },
      { next: "/reservar" },
      /perfil/i,
    ],
    ["mis citas", () => import("@/app/s/[slug]/citas/page"), { slug }, {}, /Mis citas/],
    ["reservar", () => import("@/app/s/[slug]/reservar/page"), { slug }, {}, /Reservar/],
  ] as [string, Load, object, object, RegExp][])("%s", async (_, load, params, search, heading) => {
    server.viewer = CUSTOMER;
    withSupabase({ dataset: dataset() });
    await show(load, params, search);
    expect(h1()).toHaveTextContent(heading);
  });

  it("sin perfil, manda a completarlo; el perfil se muestra vacío", async () => {
    server.viewer = CUSTOMER;
    withSupabase({ dataset: { ...dataset(), customers: [] } });
    expect(
      await redirectOf(() => show(() => import("@/app/s/[slug]/mascotas/page"), { slug })),
    ).toBe("/perfil?next=%2Fmascotas");
    await show(() => import("@/app/s/[slug]/perfil/page"), { slug });
    expect(h1()).toBeInTheDocument();
  });

  it("listas vacías: sin mascotas y sin citas", async () => {
    server.viewer = CUSTOMER;
    withSupabase({ dataset: { ...dataset(), pets: [], appointments: [] } });
    const pets = await show(() => import("@/app/s/[slug]/mascotas/page"), { slug });
    expect(screen.getByText(/Aún no tienes mascotas/)).toBeInTheDocument();
    pets.unmount();
    await show(() => import("@/app/s/[slug]/citas/page"), { slug });
    expect(screen.getByText("No tienes citas próximas.")).toBeInTheDocument();
  });

  it("una mascota ajena da 404", async () => {
    server.viewer = CUSTOMER;
    withSupabase({ dataset: { ...dataset(), pets: [] } });
    await expect(
      show(() => import("@/app/s/[slug]/mascotas/[id]/page"), { slug, id: IDS.pet }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("páginas públicas del spa", () => {
  it.each([
    ["portada", () => import("@/app/s/[slug]/page"), { slug }, {}],
    ["servicios", () => import("@/app/s/[slug]/servicios/page"), { slug }, { local: IDS.location }],
    [
      "ingresar",
      () => import("@/app/s/[slug]/ingresar/page"),
      { slug },
      { next: "/reservar", error: "auth" },
    ],
    ["sin acceso", () => import("@/app/s/[slug]/sin-acceso/page"), { slug }, {}],
  ] as [string, Load, object, object][])("%s", async (_, load, params, search) => {
    server.viewer = null;
    withSupabase({ dataset: dataset() });
    await show(load, params, search);
    expect(h1()).toBeInTheDocument();
  });

  it("ingresar con sesión muestra la cuenta", async () => {
    withSupabase({ dataset: dataset(), user: { id: "u1", email: "ana@spa.test" } });
    await show(() => import("@/app/s/[slug]/ingresar/page"), { slug });
    expect(screen.getByText("ana@spa.test")).toBeInTheDocument();
  });

  it("servicios sin locales lo dice", async () => {
    withSupabase({ dataset: { ...dataset(), locations: [] } });
    await show(() => import("@/app/s/[slug]/servicios/page"), { slug });
    expect(h1()).toBeInTheDocument();
  });
});

describe("consola de Prisma Lab", () => {
  it.each([
    ["inicio", () => import("@/app/platform/page"), {}, {}],
    ["elegir spa", () => import("@/app/platform/elegir/page"), {}, {}],
    ["ingresar", () => import("@/app/platform/ingresar/page"), {}, {}],
    ["sin acceso", () => import("@/app/platform/sin-acceso/page"), {}, {}],
    ["razas", () => import("@/app/platform/razas/page"), {}, {}],
    ["raza nueva", () => import("@/app/platform/razas/nueva/page"), {}, {}],
    ["raza", () => import("@/app/platform/razas/[id]/page"), { id: IDS.globalBreed }, {}],
    ["spa nuevo", () => import("@/app/platform/spas/nuevo/page"), {}, {}],
    ["spa", () => import("@/app/platform/spas/[slug]/page"), { slug }, {}],
  ] as [string, Load, object, object][])("%s", async (_, load, params, search) => {
    server.viewer = { ...SUPER_ADMIN, tenants: [{ slug, name: TENANT.name }] };
    withSupabase({
      dataset: dataset(),
      rpcs: {
        tenant_staff: {
          data: [
            { email: "a@spa.test", status: "active" },
            { email: "b@spa.test", status: "invited" },
          ],
          error: null,
        },
      },
    });
    await show(load, params, search);
    expect(h1()).toBeInTheDocument();
  });

  it("sin admins ni spas muestra los estados vacíos; 404 si no existe", async () => {
    server.viewer = SUPER_ADMIN;
    withSupabase({
      dataset: { ...dataset(), tenants: [] },
      rpcs: { tenant_staff: { data: [], error: null } },
    });
    await show(() => import("@/app/platform/page"));
    expect(h1()).toBeInTheDocument();
    await expect(
      show(() => import("@/app/platform/spas/[slug]/page"), { slug }),
    ).rejects.toBeInstanceOf(NotFoundError);
    withSupabase({ dataset: { ...dataset(), global_breeds: [] } });
    await expect(
      show(() => import("@/app/platform/razas/[id]/page"), { id: IDS.globalBreed }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("quien no es super admin va a su destino", async () => {
    server.viewer = CUSTOMER;
    expect(await redirectOf(() => show(() => import("@/app/platform/page")))).toBe("/sin-acceso");
    server.viewer = { ...CUSTOMER, tenants: [{ slug, name: TENANT.name }] };
    expect(await redirectOf(() => show(() => import("@/app/platform/razas/page")))).toBe(
      "http://spa.localhost:3000/admin",
    );
    server.viewer = CUSTOMER;
    expect(await redirectOf(() => show(() => import("@/app/platform/elegir/page")))).toBe(
      "/sin-acceso",
    );
  });
});

describe("layouts, 404 y rutas", () => {
  it("el layout raíz y el de la consola envuelven el contenido", async () => {
    const { default: RootLayout } = await import("@/app/layout");
    const html = RootLayout({ children: <p>hola</p> } as never) as { props: { lang: string } };
    expect(html.props.lang).toBe("es-CO");
    const { default: PlatformLayout } = await import("@/app/platform/layout");
    await renderServer(PlatformLayout({ children: <p>consola</p> } as never) as never);
    expect(screen.getByText("consola")).toBeInTheDocument();
  });

  it("el layout del spa carga su tema y su título", async () => {
    const layout = await import("@/app/s/[slug]/layout");
    expect(await layout.generateMetadata(pageProps({ slug }))).toMatchObject({
      title: { default: TENANT.name },
    });
    await renderServer(
      layout.default({
        ...(pageProps({ slug }) as object),
        children: <p>spa</p>,
      } as never) as never,
    );
    expect(screen.getByText("spa")).toBeInTheDocument();
  });

  it("not-found", async () => {
    const { default: NotFound } = await import("@/app/not-found");
    await renderServer(NotFound());
    expect(h1()).toBeInTheDocument();
  });

  it("health responde ok", async () => {
    const { GET } = await import("@/app/api/health/route");
    expect(await GET().json()).toEqual({ ok: true });
  });

  it("los callbacks de OAuth redirigen según el resultado", async () => {
    const tenantRoute = await import("@/app/s/[slug]/auth/callback/route");
    const platformRoute = await import("@/app/platform/auth/callback/route");
    const fake = withSupabase({ dataset: dataset() });
    fake.client.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "u" } },
      error: null,
    } as never);
    (loadViewer as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
      ...CUSTOMER,
      tenants: [],
    });
    const request = (query: string, host = "spa.localhost:3000") =>
      new NextRequest(`http://${host}/auth/callback${query}`, { headers: { host } });

    const withNext = await tenantRoute.GET(request("?code=c&next=/reservar"), pageProps({ slug }));
    expect(withNext.headers.get("location")).toBe("http://spa.localhost:3000/reservar");
    const home = await tenantRoute.GET(request("?code=c"), pageProps({ slug }));
    expect(home.headers.get("location")).toBe("http://spa.localhost:3000/");
    const failed = await platformRoute.GET(request("", "admin.localhost:3000"));
    expect(failed.headers.get("location")).toBe("http://admin.localhost:3000/ingresar?error=auth");
  });
});
