import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dataset, IDS } from "../../fixtures/dataset";
import { pageProps, renderServer } from "../../render-server";
import { NotFoundError, redirectOf, server, withSupabase } from "../../server-env";

// Páginas del panel del spa: renderizan con datos de ejemplo (consultas reales sobre el
// Supabase simulado). Los flujos completos se prueban en E2E.

const slug = "spa";
const rpcs = {
  explain_slots: {
    data: [
      {
        starts_at: "2026-11-02T13:00:00+00:00",
        estimated_ready_at: "2026-11-02T14:30:00+00:00",
        code: null,
        detail: null,
        overridable: false,
      },
      {
        starts_at: "2026-11-02T13:15:00+00:00",
        estimated_ready_at: "2026-11-02T14:45:00+00:00",
        code: "CUPO_LLENO",
        detail: {
          jornadas: { num: 2, den: 1 },
          remaining: { num: 0, den: 1 },
          needed: { num: 1, den: 6 },
        },
        overridable: true,
      },
    ],
    error: null,
  },
  location_occupancy: {
    data: [
      {
        day: "2026-11-01",
        closed: true,
        jornadas: null,
        used: { num: 0, den: 1 },
        percent: null,
        by_size: [],
      },
      {
        day: "2026-11-02",
        closed: false,
        jornadas: { num: 2, den: 1 },
        used: { num: 7, den: 6 },
        percent: 58,
        by_size: [{ size: "M", pets: 4 }],
      },
      {
        day: "2026-11-03",
        closed: false,
        jornadas: { num: 1, den: 1 },
        used: { num: 1, den: 1 },
        percent: 100,
        by_size: [],
      },
      {
        day: "2026-11-04",
        closed: false,
        jornadas: { num: 1, den: 1 },
        used: { num: 5, den: 6 },
        percent: 83,
        by_size: [],
      },
      {
        day: "2026-11-05",
        closed: false,
        jornadas: null,
        used: { num: 0, den: 1 },
        percent: null,
        by_size: [],
      },
    ],
    error: null,
  },
};

const pages: [
  string,
  () => Promise<{ default: (props: never) => unknown }>,
  object,
  object,
  RegExp,
][] = [
  ["inicio", () => import("@/app/s/[slug]/admin/page"), { slug }, {}, /Spa Prueba|Panel|Inicio/],
  [
    "agenda",
    () => import("@/app/s/[slug]/admin/agenda/page"),
    { slug },
    { fecha: "2026-11-02" },
    /Agenda/,
  ],
  [
    "nueva cita (buscar)",
    () => import("@/app/s/[slug]/admin/citas/nueva/page"),
    { slug },
    { q: "Luc" },
    /Nueva cita/,
  ],
  [
    "nueva cita (cliente)",
    () => import("@/app/s/[slug]/admin/citas/nueva/page"),
    { slug },
    { cliente: IDS.customer },
    /Nueva cita para Lucía Gómez/,
  ],
  [
    "clientes",
    () => import("@/app/s/[slug]/admin/clientes/page"),
    { slug },
    { q: "Lu" },
    /Clientes/,
  ],
  [
    "cliente nuevo",
    () => import("@/app/s/[slug]/admin/clientes/nuevo/page"),
    { slug },
    {},
    /Inscribir|cliente/i,
  ],
  [
    "cliente",
    () => import("@/app/s/[slug]/admin/clientes/[id]/page"),
    { slug, id: IDS.customer },
    {},
    /Lucía Gómez/,
  ],
  [
    "mascota nueva del cliente",
    () => import("@/app/s/[slug]/admin/clientes/[id]/mascotas/nueva/page"),
    { slug, id: IDS.customer },
    {},
    /mascota/i,
  ],
  [
    "mascota del cliente",
    () => import("@/app/s/[slug]/admin/clientes/[id]/mascotas/[petId]/page"),
    { slug, id: IDS.customer, petId: IDS.pet },
    {},
    /Rocky/,
  ],
  ["locales", () => import("@/app/s/[slug]/admin/locales/page"), { slug }, {}, /Locales/],
  ["local nuevo", () => import("@/app/s/[slug]/admin/locales/nuevo/page"), { slug }, {}, /local/i],
  [
    "local",
    () => import("@/app/s/[slug]/admin/locales/[id]/page"),
    { slug, id: IDS.location },
    {},
    /Sede principal/,
  ],
  [
    "¿por qué no hay cupo?",
    () => import("@/app/s/[slug]/admin/locales/[id]/disponibilidad/page"),
    { slug, id: IDS.location },
    { date: "2026-11-02", service: IDS.bath, cut: IDS.cut },
    /¿Por qué no hay cupo\?/,
  ],
  [
    "ocupación",
    () => import("@/app/s/[slug]/admin/ocupacion/page"),
    { slug },
    { mes: "2026-11" },
    /Ocupación/,
  ],
  ["personal", () => import("@/app/s/[slug]/admin/personal/page"), { slug }, {}, /Personal/],
  [
    "persona nueva",
    () => import("@/app/s/[slug]/admin/personal/nuevo/page"),
    { slug },
    {},
    /Nuevo integrante/,
  ],
  [
    "persona",
    () => import("@/app/s/[slug]/admin/personal/[id]/page"),
    { slug, id: IDS.staff },
    {},
    /Ana/,
  ],
  ["razas", () => import("@/app/s/[slug]/admin/razas/page"), { slug }, {}, /Razas/],
  ["raza nueva", () => import("@/app/s/[slug]/admin/razas/nueva/page"), { slug }, {}, /raza/i],
  [
    "raza",
    () => import("@/app/s/[slug]/admin/razas/[id]/page"),
    { slug, id: IDS.breed },
    {},
    /Pug/,
  ],
  ["servicios", () => import("@/app/s/[slug]/admin/servicios/page"), { slug }, {}, /Servicios/],
  [
    "servicio nuevo",
    () => import("@/app/s/[slug]/admin/servicios/nuevo/page"),
    { slug },
    {},
    /servicio/i,
  ],
  [
    "servicio",
    () => import("@/app/s/[slug]/admin/servicios/[id]/page"),
    { slug, id: IDS.bath },
    {},
    /Baño/,
  ],
  [
    "precios",
    () => import("@/app/s/[slug]/admin/servicios/[id]/precios/page"),
    { slug, id: IDS.bath },
    { local: IDS.location },
    /Precios|Baño/,
  ],
];

describe("páginas del panel del spa", () => {
  it.each(pages)("%s", async (_, load, params, search, heading) => {
    withSupabase({ dataset: dataset(), rpcs });
    const { default: Page } = await load();
    await renderServer(Page(pageProps(params, search)));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(heading);
  });

  it("sin locales, la agenda y la ocupación invitan a crear uno", async () => {
    withSupabase({ dataset: { ...dataset(), locations: [] }, rpcs });
    for (const load of [
      () => import("@/app/s/[slug]/admin/agenda/page"),
      () => import("@/app/s/[slug]/admin/ocupacion/page"),
    ]) {
      const { default: Page } = await load();
      const { unmount } = await renderServer(Page(pageProps({ slug })));
      expect(screen.getByRole("link", { name: "Crea un local" })).toBeInTheDocument();
      unmount();
    }
  });

  it("listas vacías muestran su estado", async () => {
    withSupabase({
      dataset: { ...dataset(), appointments: [], customers: [], staff: [], services: [], pets: [] },
      rpcs,
    });
    for (const [load, params, search] of [
      [() => import("@/app/s/[slug]/admin/agenda/page"), { slug }, { fecha: "2026-11-02" }],
      [() => import("@/app/s/[slug]/admin/clientes/page"), { slug }, { q: "zz" }],
      [() => import("@/app/s/[slug]/admin/citas/nueva/page"), { slug }, { q: "zz" }],
      [() => import("@/app/s/[slug]/admin/personal/page"), { slug }, {}],
      [() => import("@/app/s/[slug]/admin/servicios/page"), { slug }, {}],
    ] as const) {
      const { default: Page } = await load();
      const { unmount } = await renderServer(Page(pageProps(params, search)));
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      unmount();
    }
  });

  it("ids inválidos o inexistentes dan 404", async () => {
    withSupabase({
      dataset: {
        ...dataset(),
        locations: [],
        customers: [],
        staff: [],
        services: [],
        tenant_breeds: [],
      },
    });
    for (const [load, params] of [
      [() => import("@/app/s/[slug]/admin/locales/[id]/page"), { slug, id: "x" }],
      [() => import("@/app/s/[slug]/admin/locales/[id]/page"), { slug, id: IDS.location }],
      [
        () => import("@/app/s/[slug]/admin/locales/[id]/disponibilidad/page"),
        { slug, id: IDS.location },
      ],
      [() => import("@/app/s/[slug]/admin/clientes/[id]/page"), { slug, id: IDS.customer }],
      [() => import("@/app/s/[slug]/admin/personal/[id]/page"), { slug, id: IDS.staff }],
      [() => import("@/app/s/[slug]/admin/servicios/[id]/page"), { slug, id: IDS.bath }],
      [() => import("@/app/s/[slug]/admin/razas/[id]/page"), { slug, id: IDS.breed }],
    ] as const) {
      const { default: Page } = await load();
      await expect(renderServer(Page(pageProps(params)))).rejects.toBeInstanceOf(NotFoundError);
    }
  });

  it("sin sesión manda a ingresar y sin permiso a sin-acceso", async () => {
    const { default: Page } = await import("@/app/s/[slug]/admin/agenda/page");
    server.viewer = null;
    expect(await redirectOf(() => renderServer(Page(pageProps({ slug }))))).toBe(
      "/ingresar?next=%2Fadmin%2Fagenda",
    );
    server.viewer = {
      ...server.viewer!,
      userId: "u",
      email: "x",
      isSuperAdmin: false,
      tenants: [],
    } as never;
    expect(await redirectOf(() => renderServer(Page(pageProps({ slug }))))).toBe("/sin-acceso");
  });
});
