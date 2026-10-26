import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  MONDAY,
  SATURDAY,
  SUNDAY,
  addDays,
  admin,
  booked,
  customer,
  must,
  setupCapacityTenant,
  setupLocation,
  staff,
  teardownCapacityTenant,
} from "./capacity-fixture";

// T40 · Ocupación(F) = Usado / Jornadas, también por talla (SPEC §5.3).

type Day = {
  day: string;
  closed: boolean;
  jornadas: { num: number; den: number } | null;
  used: { num: number; den: number };
  percent: number | null;
  by_size: { size: string; pets: number }[];
};

beforeAll(() => setupCapacityTenant("ocupacion"));
afterAll(() => teardownCapacityTenant());

async function occupancy(locationId: string, from: string, to: string) {
  const data = await must(
    staff.client.rpc("location_occupancy", { p_location_id: locationId, p_from: from, p_to: to }),
  );
  return new Map((data as Day[]).map((d) => [d.day, d]));
}

describe("location_occupancy", () => {
  it("cada día: jornadas, cupo usado, porcentaje y mascotas por talla", async () => {
    const location = await setupLocation({ beto: "half" });
    await booked(location, MONDAY, "08:00", "09:30", [
      { size: "L", count: 2 },
      { size: "M", count: 3 },
    ]);
    await booked(location, MONDAY, "13:00", "14:30", [{ size: "M", count: 1 }]);
    const days = await occupancy(location, MONDAY, SUNDAY);
    expect(days.size).toBe(7);

    expect(days.get(MONDAY)).toEqual({
      day: MONDAY,
      closed: false,
      jornadas: { num: 3, den: 2 }, // Ana + ½ de Beto
      used: { num: 7, den: 6 }, // ½ + ½ + ⅙
      percent: 78,
      by_size: [
        { size: "M", pets: 4 },
        { size: "L", pets: 2 },
      ],
    });
    expect(days.get(SATURDAY)).toMatchObject({
      closed: false,
      jornadas: { num: 1, den: 1 },
      percent: 0,
      by_size: [],
    });
    expect(days.get(SUNDAY)).toMatchObject({ closed: true, jornadas: null, percent: null });
  });

  it("las citas canceladas no cuentan", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "08:00", "09:30", [{ size: "L", count: 4 }]);
    await must(
      admin.from("appointments").update({ status: "cancelled" }).eq("location_id", location),
    );
    const days = await occupancy(location, MONDAY, MONDAY);
    expect(days.get(MONDAY)).toMatchObject({ used: { num: 0, den: 1 }, percent: 0 });
  });

  it("solo el staff y con rangos de hasta 2 meses", async () => {
    const location = await setupLocation();
    const denied = await customer.client.rpc("location_occupancy", {
      p_location_id: location,
      p_from: MONDAY,
      p_to: MONDAY,
    });
    expect(denied.error?.code).toBe("42501");
    const long = await staff.client.rpc("location_occupancy", {
      p_location_id: location,
      p_from: MONDAY,
      p_to: addDays(MONDAY, 90),
    });
    expect(long.error?.code).toBe("22023");
  });
});
