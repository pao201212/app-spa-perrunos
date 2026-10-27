import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  MONDAY,
  type Pet,
  SATURDAY,
  SUNDAY,
  type Slot,
  addDays,
  admin,
  bath,
  booked,
  breedCut,
  customer,
  dog,
  evaluate,
  evaluateAt,
  local,
  must,
  nailCut,
  pets,
  setupCapacityTenant,
  setupLocation,
  slots,
  slowExtra,
  staff,
  teardownCapacityTenant,
} from "./capacity-fixture";
import { anonClient } from "./helpers";

// T37 · Capacidad simple: escenarios S1–S16 de docs/capacidad.md §3.5 (S9 se prueba con capacity.book).

beforeAll(() => setupCapacityTenant("cap"));
afterAll(() => teardownCapacityTenant());

describe("escenarios de la capacidad simple (docs/capacidad.md §3.5)", () => {
  it("S1: lunes sin reservas, mediano corto a las 08:00 → entrega 09:30", async () => {
    const location = await setupLocation();
    expect(await slots(location, MONDAY, [dog("M", "short")])).toContain("08:00→09:30");
  });

  it("S2: con 4 grandes y 6 medianos cortos el lunes está lleno (CUPO_LLENO)", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "08:00", "09:30", [
      { size: "L", count: 4 },
      { size: "M", count: 6 },
    ]);
    expect(await slots(location, MONDAY, [dog("S", "short")])).toEqual([]);
    const row = await evaluateAt(location, MONDAY, "13:00", [dog("S", "short")]);
    expect(row.code).toBe("CUPO_LLENO");
    expect(row.detail).toMatchObject({
      jornadas: { num: 2, den: 1 },
      remaining: { num: 0 },
      needed: { num: 1, den: 8 },
    });
  });

  it("S3: con 1 jornada usada caben 4 medianos largos juntos, no 5", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "08:00", "09:30", [
      { size: "L", count: 2 },
      { size: "M", count: 3 },
    ]);
    expect(await slots(location, MONDAY, pets(4, dog("M", "long")))).toContain("13:00→14:30");
    expect((await evaluateAt(location, MONDAY, "13:00", pets(5, dog("M", "long")))).code).toBe(
      "CUPO_LLENO",
    );
  });

  it("S4: con Beto ausente el lunes solo hay 1 jornada: el 5.º grande no cabe", async () => {
    const location = await setupLocation({ beto: "absent" });
    await booked(location, MONDAY, "08:00", "09:30", [{ size: "L", count: 3 }]);
    expect(await slots(location, MONDAY, [dog("L", "short")])).toContain("13:00→14:30");
    await booked(location, MONDAY, "10:00", "11:30", [{ size: "L", count: 1 }]);
    expect((await evaluateAt(location, MONDAY, "13:00", [dog("L", "short")])).code).toBe(
      "CUPO_LLENO",
    );
  });

  it("S5: Beto solo de 08:00 a 12:00 (½ jornada): caben 6 grandes cortos", async () => {
    const location = await setupLocation({ beto: "half" });
    await booked(location, MONDAY, "08:00", "09:30", [{ size: "L", count: 5 }]);
    expect(await slots(location, MONDAY, [dog("L", "short")])).toContain("13:00→14:30");
    await booked(location, MONDAY, "13:00", "14:30", [{ size: "L", count: 1 }]);
    const row = await evaluateAt(location, MONDAY, "15:00", [dog("L", "short")]);
    expect(row.code).toBe("CUPO_LLENO");
    expect(row.detail).toMatchObject({ jornadas: { num: 3, den: 2 } });
  });

  it("S6: el domingo está cerrado", async () => {
    const location = await setupLocation();
    expect(await slots(location, SUNDAY, [dog("M", "short")])).toEqual([]);
    expect(await evaluate(location, SUNDAY, [dog("M", "short")])).toEqual([
      { starts: null, ready: null, code: "CERRADO", detail: { reason: null } },
    ]);
  });

  it("S7: el sábado solo cuenta Ana (Caro no baña): caben 4 grandes", async () => {
    const location = await setupLocation();
    await booked(location, SATURDAY, "08:00", "09:30", [{ size: "L", count: 3 }]);
    expect(await slots(location, SATURDAY, [dog("L", "short")])).toContain("10:00→11:30");
    await booked(location, SATURDAY, "08:00", "09:30", [{ size: "L", count: 1 }]);
    expect((await evaluateAt(location, SATURDAY, "10:00", [dog("L", "short")])).code).toBe(
      "CUPO_LLENO",
    );
  });

  it("S8: queda ⅙ de jornada: dos medianos que vienen juntos no caben (todas o ninguna)", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "08:00", "09:30", [
      { size: "L", count: 4 },
      { size: "M", count: 5 },
    ]);
    const row = await evaluateAt(location, MONDAY, "13:00", pets(2, dog("M", "short")));
    expect(row.code).toBe("CUPO_LLENO");
    expect(row.detail).toMatchObject({
      remaining: { num: 1, den: 6 },
      needed: { num: 1, den: 3 },
    });
    expect(await slots(location, MONDAY, [dog("M", "short")])).toContain("13:00→14:30");
  });

  it("S10–S12: horas cada 15 min con entrega; el almuerzo no cuenta; nada después del cierre", async () => {
    const location = await setupLocation();
    const list = await slots(location, MONDAY, [dog("M", "short")]);
    expect(list.slice(0, 2)).toEqual(["08:00→09:30", "08:15→09:45"]);
    expect(list.at(-1)).toBe("15:30→17:00");
    expect(list).toContain("11:30→14:00"); // S12: 30 min antes del almuerzo + 60 después
    expect(list.filter((s) => s.startsWith("12:"))).toEqual([]);
    expect(list).toHaveLength(16 + 11); // 08:00–11:45 y 13:00–15:30

    const late = await evaluateAt(location, MONDAY, "15:45", [dog("M", "short")]);
    expect(late.code).toBe("FUERA_DE_HORARIO"); // S11
    expect(late.ready).toBe("17:15");
  });

  it("S13: con 6 mascotas entre 10:00 y 11:30 no hay espacio a las 10:00", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "10:00", "11:30", [{ size: "M", count: 6 }]);
    const row = await evaluateAt(location, MONDAY, "10:00", [dog("M", "short")]);
    expect(row.code).toBe("SIN_ESPACIO");
    expect(row.detail).toMatchObject({ present: 6, max: 6 });
    expect(local((row.detail as { at: string }).at)).toBe("10:00");

    const list = await slots(location, MONDAY, [dog("M", "short")]);
    expect(list).toContain("08:30→10:00"); // sale justo cuando llegan las otras
    expect(list).not.toContain("08:45→10:15");
    expect(list.find((s) => s >= "09")).toBe("11:30→14:00");
  });

  it("S14: en el almuerzo solo cuentan las zonas de espera", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "11:30", "14:00", [{ size: "M", count: 4 }]);
    const row = await evaluateAt(location, MONDAY, "11:00", [dog("M", "short")]);
    expect(row.code).toBe("SIN_ESPACIO");
    expect(row.detail).toMatchObject({ present: 4, max: 4 });
    expect(local((row.detail as { at: string }).at)).toBe("12:00");
  });

  it("S15: baño + corte de raza el sábado cuenta como 1 baño y entrega a las 10:30", async () => {
    const location = await setupLocation();
    await booked(location, SATURDAY, "11:00", "12:30", [{ size: "M", count: 5 }]);
    expect(await slots(location, SATURDAY, [dog("M", "short", [bath, breedCut])])).toContain(
      "08:00→10:30",
    );
  });

  it("S16: con el día lleno, un corte de uñas solo sigue disponible", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "08:00", "09:30", [
      { size: "L", count: 4 },
      { size: "M", count: 6 },
    ]);
    expect(await slots(location, MONDAY, [dog("M", "short", [nailCut])])).toContain("09:00→09:15");
  });
});

describe("otras reglas", () => {
  it("los extras con minutos alargan la entrega", async () => {
    const location = await setupLocation();
    expect(await slots(location, MONDAY, [dog("M", "short", [bath], [slowExtra])])).toContain(
      "08:00→09:45",
    );
  });

  it("SIN_EMPLEADOS si ese día nadie que bañe tiene turno", async () => {
    const location = await setupLocation({ ana: false, beto: "none" });
    expect((await evaluateAt(location, MONDAY, "08:00", [dog("M", "short")])).code).toBe(
      "SIN_EMPLEADOS",
    );
    // Un servicio sin baño no necesita bañadores.
    expect(await slots(location, MONDAY, [dog("M", "short", [nailCut])])).toContain("08:00→08:15");
  });

  it("SIN_CAPACIDAD, SIN_PRECIO y SIN_DURACION según la combinación", async () => {
    const location = await setupLocation();
    const cat: Pet = { species: "cat", size: "M", coat: "short", services: [bath] };
    await must(admin.from("services").update({ species: "both" }).eq("id", bath));
    expect((await evaluateAt(location, MONDAY, "08:00", [cat])).code).toBe("SIN_CAPACIDAD");
    expect((await evaluateAt(location, MONDAY, "08:00", [dog("XXL", "long")])).code).toBe(
      "SIN_PRECIO",
    );
    expect((await evaluateAt(location, MONDAY, "08:00", [dog("XXL", "short")])).code).toBe(
      "SIN_DURACION",
    );
    await must(admin.from("services").update({ species: "dog" }).eq("id", bath));
  });

  it("PASADO y MUY_LEJOS", async () => {
    const location = await setupLocation();
    const pastMonday = addDays(MONDAY, -14);
    const past = await evaluate(location, pastMonday, [dog("M", "short")]);
    expect(new Set(past.map((r) => r.code))).toEqual(new Set(["PASADO"]));
    const far = await evaluate(location, addDays(MONDAY, 70), [dog("M", "short")]);
    expect(far[0].code).toBe("MUY_LEJOS");
  });

  it("las citas canceladas no ocupan cupo ni espacio", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "10:00", "11:30", [{ size: "M", count: 6 }]);
    await must(
      admin.from("appointments").update({ status: "cancelled" }).eq("location_id", location),
    );
    expect(await slots(location, MONDAY, [dog("M", "short")])).toContain("10:00→11:30");
  });

  it("rechaza servicios de otro spa o adicionales que no corresponden", async () => {
    const location = await setupLocation();
    const { error } = await customer.client.rpc("available_slots", {
      p_location_id: location,
      p_date: MONDAY,
      p_pets: [dog("M", "short", [nailCut], [slowExtra])],
    });
    expect(error?.code).toBe("22023");
    const unknown = await customer.client.rpc("available_slots", {
      p_location_id: location,
      p_date: MONDAY,
      p_pets: [dog("M", "short", ["00000000-0000-0000-0000-000000000000"])],
    });
    expect(unknown.error?.code).toBe("22023");
  });

  it("anon no consulta horas y un local inactivo no existe para el cliente", async () => {
    const location = await setupLocation();
    const anon = await anonClient().rpc("available_slots", {
      p_location_id: location,
      p_date: MONDAY,
      p_pets: [dog("M", "short")],
    });
    expect(anon.error).not.toBeNull();
    await must(admin.from("locations").update({ is_active: false }).eq("id", location));
    const hidden = await customer.client.rpc("available_slots", {
      p_location_id: location,
      p_date: MONDAY,
      p_pets: [dog("M", "short")],
    });
    expect(hidden.error?.code).toBe("P0002");
  });
});

describe("explain_slots (T38)", () => {
  async function explained(locationId: string, date: string, request: Pet[]) {
    const data = await must(
      staff.client.rpc("explain_slots", {
        p_location_id: locationId,
        p_date: date,
        p_pets: request,
      }),
    );
    return data as (Slot & { code: string | null; detail: unknown })[];
  }

  it("paridad: las horas sin motivo son exactamente las de available_slots", async () => {
    const location = await setupLocation({ beto: "half" });
    await booked(location, MONDAY, "10:00", "11:30", [{ size: "M", count: 6 }]);
    await booked(location, MONDAY, "13:00", "14:30", [{ size: "L", count: 1 }]);
    const codes = new Set<string>();
    for (const request of [
      [dog("M", "short")],
      pets(2, dog("L", "short")),
      [dog("S", "long", [bath, breedCut])],
      [dog("M", "short", [nailCut])],
    ]) {
      const rows = await explained(location, MONDAY, request);
      const free = rows
        .filter((r) => r.code === null)
        .map((r) => `${local(r.starts_at)}→${local(r.estimated_ready_at)}`);
      expect(free, JSON.stringify(request)).toEqual(await slots(location, MONDAY, request));
      for (const row of rows) if (row.code) codes.add(row.code);
    }
    // La prueba no es trivial: hubo horas con y sin motivo.
    expect(codes).toEqual(new Set(["SIN_ESPACIO", "CUPO_LLENO", "FUERA_DE_HORARIO"]));
  });

  it("explica cada hora del día con su código", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "10:00", "11:30", [{ size: "M", count: 6 }]);
    const rows = await explained(location, MONDAY, [dog("M", "short")]);
    const byTime = new Map(rows.map((r) => [local(r.starts_at), r.code]));
    expect(byTime.get("08:00")).toBeNull();
    expect(byTime.get("10:00")).toBe("SIN_ESPACIO");
    expect(byTime.get("15:45")).toBe("FUERA_DE_HORARIO");
  });

  it("solo el staff del spa lo consulta", async () => {
    const location = await setupLocation();
    const { error } = await customer.client.rpc("explain_slots", {
      p_location_id: location,
      p_date: MONDAY,
      p_pets: [dog("M", "short")],
    });
    expect(error?.code).toBe("42501");
  });
});

describe("sobrecupo en explain_slots", () => {
  it("marca qué motivos se pueden pasar por alto (capacity.overridable)", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "08:00", "09:30", [
      { size: "L", count: 4 },
      { size: "M", count: 6 },
    ]);
    const { data } = await staff.client.rpc("explain_slots", {
      p_location_id: location,
      p_date: MONDAY,
      p_pets: [dog("M", "short")],
    });
    expect(
      new Set(
        data!.map((r: { code: string; overridable: boolean }) => `${r.code}:${r.overridable}`),
      ),
    ).toEqual(new Set(["CUPO_LLENO:true"]));
    const { data: unpriced } = await staff.client.rpc("explain_slots", {
      p_location_id: location,
      p_date: MONDAY,
      p_pets: [dog("XXL", "long")],
    });
    expect(unpriced![0]).toMatchObject({ code: "SIN_PRECIO", overridable: false });
  });
});
