import { describe, expect, it, vi } from "vitest";

import { fakeSupabase } from "../../../tests/supabase-fake";

vi.mock("server-only", () => ({}));
const fake = fakeSupabase({
  rpcs: {
    explain_slots: { data: [{ starts_at: null, code: "CERRADO", detail: null }], error: null },
    location_occupancy: { data: [{ day: "2026-11-02", percent: 50 }], error: null },
  },
});
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => fake.client }));

const { explainSlots, getOccupancy } = await import("./queries");

describe("consultas de capacidad", () => {
  it("explainSlots llama a explain_slots con las mascotas", async () => {
    const pets = [{ species: "dog", size: "M", coat: "short", services: ["s1"] }];
    expect(await explainSlots("l1", "2026-11-02", pets)).toEqual([
      { starts_at: null, code: "CERRADO", detail: null },
    ]);
    expect(fake.client.rpc).toHaveBeenCalledWith("explain_slots", {
      p_location_id: "l1",
      p_date: "2026-11-02",
      p_pets: pets,
    });
  });

  it("getOccupancy pide el rango de días", async () => {
    expect(await getOccupancy("l1", "2026-11-01", "2026-11-30")).toEqual([
      { day: "2026-11-02", percent: 50 },
    ]);
    expect(fake.client.rpc).toHaveBeenCalledWith("location_occupancy", {
      p_location_id: "l1",
      p_from: "2026-11-01",
      p_to: "2026-11-30",
    });
  });

  it("propaga los errores", async () => {
    fake.client.rpc.mockResolvedValueOnce({ data: null, error: new Error("boom") });
    await expect(getOccupancy("l1", "2026-11-01", "2026-11-30")).rejects.toThrow("boom");
    fake.client.rpc.mockResolvedValueOnce({ data: null, error: new Error("boom") });
    await expect(explainSlots("l1", "2026-11-02", [])).rejects.toThrow("boom");
  });
});
