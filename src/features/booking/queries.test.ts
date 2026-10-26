import { describe, expect, it, vi } from "vitest";

import { fakeSupabase } from "../../../tests/supabase-fake";

vi.mock("server-only", () => ({}));
let fake = fakeSupabase();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => fake.client }));

const { getBookingCatalog } = await import("./queries");

describe("getBookingCatalog", () => {
  it("reúne servicios, adicionales, opcionales, locales y precios activos del spa", async () => {
    fake = fakeSupabase({
      tables: {
        services: { data: [{ id: "s1" }], error: null },
        extras: { data: [{ id: "e1" }], error: null },
        service_options: { data: [{ id: "o1" }], error: null },
        locations: { data: [{ id: "l1" }], error: null },
        location_service_prices: { data: [{ service_id: "s1" }], error: null },
        location_extra_prices: { data: null, error: null },
      },
    });
    expect(await getBookingCatalog("t1")).toEqual({
      services: [{ id: "s1" }],
      extras: [{ id: "e1" }],
      options: [{ id: "o1" }],
      locations: [{ id: "l1" }],
      servicePrices: [{ service_id: "s1" }],
      extraPrices: [],
    });
    expect(fake.calls).toContainEqual({
      table: "services",
      method: "match",
      args: [{ tenant_id: "t1", is_active: true }],
    });
  });

  it("falla si alguna consulta falla", async () => {
    fake = fakeSupabase({ tables: { extras: { data: null, error: new Error("boom") } } });
    await expect(getBookingCatalog("t1")).rejects.toThrow("boom");
  });
});
