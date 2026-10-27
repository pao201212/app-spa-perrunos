import { describe, expect, it, vi } from "vitest";

import { fakeSupabase } from "../../../tests/supabase-fake";

vi.mock("server-only", () => ({}));
let fake = fakeSupabase();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => fake.client }));

const { listAgenda, listOwnAppointments } = await import("./queries");

describe("consultas de citas", () => {
  it("listOwnAppointments filtra por cliente", async () => {
    fake = fakeSupabase({ tables: { appointments: { data: [{ id: "a1" }], error: null } } });
    expect(await listOwnAppointments("c1")).toEqual([{ id: "a1" }]);
    expect(fake.calls).toContainEqual({
      table: "appointments",
      method: "eq",
      args: ["customer_id", "c1"],
    });
  });

  it("listAgenda filtra por local y rango", async () => {
    fake = fakeSupabase({ tables: { appointments: { data: [{ id: "a2" }], error: null } } });
    expect(await listAgenda("l1", "2026-11-02T05:00:00Z", "2026-11-09T05:00:00Z")).toEqual([
      { id: "a2" },
    ]);
    expect(fake.calls).toEqual(
      expect.arrayContaining([
        { table: "appointments", method: "eq", args: ["location_id", "l1"] },
        { table: "appointments", method: "gte", args: ["starts_at", "2026-11-02T05:00:00Z"] },
        { table: "appointments", method: "lt", args: ["starts_at", "2026-11-09T05:00:00Z"] },
      ]),
    );
  });

  it("propaga los errores", async () => {
    fake = fakeSupabase({ tables: { appointments: { data: null, error: new Error("boom") } } });
    await expect(listOwnAppointments("c1")).rejects.toThrow("boom");
    await expect(listAgenda("l1", "a", "b")).rejects.toThrow("boom");
  });
});
