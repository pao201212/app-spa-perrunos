import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dataset, IDS } from "../../fixtures/dataset";
import { pageProps, renderServer } from "../../render-server";
import { NotFoundError, withSupabase } from "../../server-env";

// Variantes de páginas con varias ramas: sin datos previos, parámetros raros, varios locales.

const slug = "spa";
const second = {
  ...dataset().locations[0],
  id: "10000000-0000-4000-8000-000000000002",
  name: "Sede Norte",
};

describe("precios de un servicio", () => {
  const load = () => import("@/app/s/[slug]/admin/servicios/[id]/precios/page");

  it("sin duraciones pide definirlas primero", async () => {
    withSupabase({ dataset: { ...dataset(), service_durations: [] } });
    const { default: Page } = await load();
    await renderServer(Page(pageProps({ slug, id: IDS.bath })));
    expect(screen.getByRole("link", { name: "Ir a duraciones" })).toBeInTheDocument();
  });

  it("sin locales pide crear uno", async () => {
    withSupabase({ dataset: { ...dataset(), locations: [] } });
    const { default: Page } = await load();
    await renderServer(Page(pageProps({ slug, id: IDS.bath })));
    expect(screen.getByText("Crea un local para fijar precios.")).toBeInTheDocument();
  });

  it("con varios locales y sin precios aún muestra pestañas y la matriz vacía", async () => {
    withSupabase({
      dataset: {
        ...dataset(),
        locations: [dataset().locations[0], second],
        location_service_prices: [],
        location_extra_prices: [],
        services: [
          { ...dataset().services[0], extras: [{ ...dataset().extras[0], is_active: false }] },
        ],
      },
    });
    const { default: Page } = await load();
    await renderServer(Page(pageProps({ slug, id: IDS.bath }, { local: second.id })));
    expect(screen.getByRole("navigation", { name: "Locales" })).toHaveTextContent("Sede Norte");
  });

  it("ids inválidos o servicios inexistentes dan 404", async () => {
    withSupabase({ dataset: { ...dataset(), services: [] } });
    const { default: Page } = await load();
    await expect(renderServer(Page(pageProps({ slug, id: "x" })))).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(renderServer(Page(pageProps({ slug, id: IDS.bath })))).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("¿por qué no hay cupo?", () => {
  const load = () => import("@/app/s/[slug]/admin/locales/[id]/disponibilidad/page");

  it("sin servicio elegido muestra solo el formulario con los valores de la URL", async () => {
    withSupabase({ dataset: dataset() });
    const { default: Page } = await load();
    await renderServer(
      Page(
        pageProps(
          { slug, id: IDS.location },
          { service: "x", species: "cat", size: "L", coat: "long", date: ["2026-11-02"] },
        ),
      ),
    );
    expect(screen.getByLabelText("Especie")).toHaveValue("cat");
    expect(screen.getByLabelText("Talla")).toHaveValue("L");
    expect(screen.queryByRole("region", { name: "Horas del día" })).not.toBeInTheDocument();
  });

  it("un día cerrado se explica para todo el día", async () => {
    withSupabase({
      dataset: dataset(),
      rpcs: {
        explain_slots: {
          data: [
            {
              starts_at: null,
              estimated_ready_at: null,
              code: "CERRADO",
              detail: { reason: null },
            },
          ],
          error: null,
        },
      },
    });
    const { default: Page } = await load();
    await renderServer(Page(pageProps({ slug, id: IDS.location }, { service: IDS.bath })));
    expect(screen.getByText("Todo el día")).toBeInTheDocument();
  });
});

describe("clientes y local con datos distintos", () => {
  it("un cliente sin cuenta ni correo, sin mascotas ni grupos", async () => {
    withSupabase({
      dataset: {
        ...dataset(),
        customers: [{ ...dataset().customers[0], user_id: null, email: null }],
        pets: [],
        pet_groups: [],
      },
    });
    const { default: Page } = await import("@/app/s/[slug]/admin/clientes/[id]/page");
    await renderServer(Page(pageProps({ slug, id: IDS.customer })));
    expect(screen.getByText(/Agrega su correo/)).toBeInTheDocument();
    expect(screen.getByText("Este cliente no tiene mascotas registradas.")).toBeInTheDocument();
  });

  it("un cliente sin cuenta pero con correo se vinculará al ingresar", async () => {
    withSupabase({
      dataset: { ...dataset(), customers: [{ ...dataset().customers[0], user_id: null }] },
    });
    const { default: Page } = await import("@/app/s/[slug]/admin/clientes/[id]/page");
    await renderServer(Page(pageProps({ slug, id: IDS.customer })));
    expect(screen.getByText(/Se vinculará cuando ingrese con lucia@spa.test/)).toBeInTheDocument();
  });

  it("con dos locales, el detalle ofrece aplicar a los demás", async () => {
    withSupabase({ dataset: { ...dataset(), locations: [dataset().locations[0], second] } });
    const { default: Page } = await import("@/app/s/[slug]/admin/locales/[id]/page");
    await renderServer(Page(pageProps({ slug, id: IDS.location })));
    expect(screen.getByRole("region", { name: "Aplicar a otros locales" })).toBeInTheDocument();
  });

  it("las listas de clientes y locales sin búsqueda ni datos", async () => {
    withSupabase({ dataset: { ...dataset(), customers: [], locations: [] } });
    for (const load of [
      () => import("@/app/s/[slug]/admin/clientes/page"),
      () => import("@/app/s/[slug]/admin/locales/page"),
      () => import("@/app/s/[slug]/admin/citas/nueva/page"),
    ]) {
      const { default: Page } = await load();
      const { unmount } = await renderServer(Page(pageProps({ slug }, { q: ["", "x"] as never })));
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      unmount();
    }
  });
});

describe("mis citas", () => {
  it("historial, pendientes y recepción confirmada", async () => {
    const base = dataset().appointments[0] as Record<string, unknown>;
    withSupabase({
      dataset: {
        ...dataset(),
        appointments: [
          { ...base, id: "a1", status: "pending" },
          { ...base, id: "a2", status: "received", client_confirmed_at: "2026-11-02T13:05:00Z" },
          { ...base, id: "a3", status: "cancelled", starts_at: "2026-10-01T13:00:00+00:00" },
        ],
      },
    });
    const { default: Page } = await import("@/app/s/[slug]/citas/page");
    await renderServer(Page(pageProps({ slug })));
    expect(screen.getByText("El spa confirmará tu cita pronto.")).toBeInTheDocument();
    expect(screen.getByText("Confirmaste la recepción.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Historial" })).toHaveTextContent("Cancelada");
  });
});
