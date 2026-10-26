import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUsers,
  sqlClient,
  uniqueSuffix,
  type TestUser,
} from "./helpers";

// T37 · Capacidad simple: escenarios S1–S16 de docs/capacidad.md §3.5 (S9 se prueba con capacity.book).
//
// "Sede principal": L–V 08:00–12:00 y 13:00–17:00, sábado 08:00–13:00, domingo cerrado.
// Ana baña L–S, Beto baña L–V, Caro solo hace corte especial los sábados. Sala de espera: 4.
// Perro por empleado y día: pequeño 8/7/6, mediano 6/5/4, grande 4/3/3 (corto/medio/largo).
// Baño mediano corto: 40 + 30 + 20 = 90 min. Corte de raza: 60 min. Corte de uñas: 15 min.

const admin = adminClient();
const sql = sqlClient();
const suffix = uniqueSuffix();
const TZ = "America/Bogota"; // UTC−5, sin horario de verano

type Size = "S" | "M" | "L" | "XXL";
type Coat = "short" | "medium" | "long";
type Pet = {
  species?: "dog" | "cat";
  size: Size;
  coat: Coat;
  services: string[];
  extras?: string[];
};
type Slot = { starts_at: string; estimated_ready_at: string };
type Evaluation = {
  starts: string | null;
  ready: string | null;
  code: string | null;
  detail: unknown;
};

let tenantId: string;
let customer: TestUser;
let customerId: string;
let petPool: string[];
let bath: string;
let breedCut: string;
let nailCut: string;
let slowExtra: string;
let locationCount = 0;

const PER_STAFF: Record<"S" | "M" | "L", Record<Coat, number>> = {
  S: { short: 8, medium: 7, long: 6 },
  M: { short: 6, medium: 5, long: 4 },
  L: { short: 4, medium: 3, long: 3 },
};

/** Fecha local (YYYY-MM-DD) del primer lunes al menos 7 días después de hoy. */
function nextMonday(): string {
  const date = new Date(Date.now() + 7 * 86_400_000);
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MONDAY = nextMonday();
const SATURDAY = addDays(MONDAY, 5);
const SUNDAY = addDays(MONDAY, 6);
const at = (date: string, time: string) => `${date}T${time}:00-05:00`;
const local = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

async function must<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await query;
  if (error) throw error;
  return data as NonNullable<T>;
}

type Options = { beto?: "full" | "half" | "absent" | "none"; ana?: boolean };

/** Un local nuevo con el horario, el personal y la capacidad del ejemplo. */
async function setupLocation({ beto = "full", ana = true }: Options = {}): Promise<string> {
  const n = ++locationCount;
  const location = await must(
    admin
      .from("locations")
      .insert({ tenant_id: tenantId, name: `Sede ${n}`, max_days_ahead: 60 })
      .select("id")
      .single(),
  );
  const base = { tenant_id: tenantId, location_id: location.id };
  const weekdays = [1, 2, 3, 4, 5];
  await must(
    admin.from("location_hours").insert([
      ...weekdays.flatMap((weekday) => [
        { ...base, weekday, opens_at: "08:00", closes_at: "12:00" },
        { ...base, weekday, opens_at: "13:00", closes_at: "17:00" },
      ]),
      { ...base, weekday: 6, opens_at: "08:00", closes_at: "13:00" },
    ]),
  );
  await must(admin.from("location_waiting_zones").insert({ ...base, name: "Sala", seats: 4 }));
  await must(
    admin.from("location_pet_capacity").insert(
      (["S", "M", "L"] as const).flatMap((size) =>
        (["short", "medium", "long"] as const).map((coat) => ({
          ...base,
          species: "dog" as const,
          size,
          coat,
          pets_per_staff: PER_STAFF[size][coat],
        })),
      ),
    ),
  );
  const prices = (["S", "M", "L"] as const).flatMap((size) =>
    (["short", "medium", "long"] as const).flatMap((coat) =>
      [bath, breedCut, nailCut].map((service_id) => ({
        ...base,
        service_id,
        size,
        coat,
        price_cop: 40000,
      })),
    ),
  );
  // XXL tiene precio de baño pero no duración (SIN_DURACION).
  prices.push({ ...base, service_id: bath, size: "XXL" as never, coat: "short", price_cop: 90000 });
  await must(admin.from("location_service_prices").insert(prices));
  await must(
    admin.from("location_extra_prices").insert({
      ...base,
      extra_id: slowExtra,
      size: "M",
      coat: "short",
      price_cop: 10000,
    }),
  );

  const person = async (name: string, skill: "bath" | "special_cut") => {
    const staff = await must(
      admin
        .from("staff")
        .insert({ tenant_id: tenantId, name: `${name} ${n}` })
        .select("id")
        .single(),
    );
    await must(
      admin.from("staff_skills").insert({ tenant_id: tenantId, staff_id: staff.id, skill }),
    );
    return staff.id;
  };
  const shifts = (staffId: string, days: number[], starts: string, ends: string) =>
    must(
      admin.from("staff_shifts").insert(
        days.map((weekday) => ({
          ...base,
          staff_id: staffId,
          weekday,
          starts_at: starts,
          ends_at: ends,
        })),
      ),
    );

  if (ana) {
    const anaId = await person("Ana", "bath");
    await shifts(anaId, weekdays, "08:00", "17:00");
    await shifts(anaId, [6], "08:00", "13:00");
  }
  if (beto !== "none") {
    const betoId = await person("Beto", "bath");
    await shifts(betoId, weekdays, "08:00", beto === "half" ? "12:00" : "17:00");
    if (beto === "absent") {
      await must(
        admin.from("staff_absences").insert({
          tenant_id: tenantId,
          staff_id: betoId,
          starts_at: at(MONDAY, "00:00"),
          ends_at: at(addDays(MONDAY, 1), "00:00"),
        }),
      );
    }
  }
  const caroId = await person("Caro", "special_cut");
  await shifts(caroId, [6], "08:00", "13:00");
  return location.id;
}

/** Reserva directa (sin capacity.book) de mascotas con baño para preparar el escenario. */
async function booked(
  locationId: string,
  date: string,
  starts: string,
  ready: string,
  pets: { size: "S" | "M" | "L"; coat?: Coat; count: number }[],
) {
  const appointment = await must(
    admin
      .from("appointments")
      .insert({
        tenant_id: tenantId,
        location_id: locationId,
        customer_id: customerId,
        status: "scheduled",
        starts_at: at(date, starts),
        estimated_ready_at: at(date, ready),
        total_cop: 0,
        source: "admin",
      })
      .select("id")
      .single(),
  );
  const rows = pets.flatMap(({ size, coat = "short", count }) =>
    Array.from({ length: count }, () => ({ size, coat })),
  );
  if (rows.length > petPool.length) throw new Error("Faltan mascotas en el fixture");
  await must(
    admin.from("appointment_pets").insert(
      rows.map((row, i) => ({
        tenant_id: tenantId,
        appointment_id: appointment.id,
        pet_id: petPool[i],
        species: "dog" as const,
        size: row.size,
        coat: row.coat,
        quota_divisor: PER_STAFF[row.size][row.coat],
      })),
    ),
  );
}

const dog = (size: Size, coat: Coat, services = [bath], extras: string[] = []): Pet => ({
  species: "dog",
  size,
  coat,
  services,
  extras,
});
const pets = (count: number, pet: Pet) => Array.from({ length: count }, () => pet);

async function slots(locationId: string, date: string, request: Pet[]) {
  const data = await must(
    customer.client.rpc("available_slots", {
      p_location_id: locationId,
      p_date: date,
      p_pets: request,
    }),
  );
  return (data as Slot[]).map((s) => `${local(s.starts_at)}→${local(s.estimated_ready_at)}`);
}

async function evaluate(locationId: string, date: string, request: Pet[]): Promise<Evaluation[]> {
  const rows = await sql<
    {
      starts_at: Date | null;
      estimated_ready_at: Date | null;
      code: string | null;
      detail: unknown;
    }[]
  >`
    select * from capacity.evaluate(${locationId}, ${date}, ${sql.json(request)})`;
  return rows.map((r) => ({
    starts: r.starts_at && local(r.starts_at.toISOString()),
    ready: r.estimated_ready_at && local(r.estimated_ready_at.toISOString()),
    code: r.code,
    detail: r.detail,
  }));
}

async function evaluateAt(locationId: string, date: string, time: string, request: Pet[]) {
  const row = (await evaluate(locationId, date, request)).find((r) => r.starts === time);
  if (!row) throw new Error(`No hay hora candidata ${time}`);
  return row;
}

beforeAll(async () => {
  const tenant = await must(
    admin
      .from("tenants")
      .insert({ slug: `cap-${suffix}`, name: "Capacidad simple", is_active: true, timezone: TZ })
      .select("id")
      .single(),
  );
  tenantId = tenant.id;
  customer = await createTestUser("cliente-capacidad");
  customerId = (
    await must(
      admin
        .from("customers")
        .insert({ tenant_id: tenantId, user_id: customer.id, full_name: "Cliente" })
        .select("id")
        .single(),
    )
  ).id;
  const breed = await must(
    admin
      .from("tenant_breeds")
      .select("id")
      .match({ tenant_id: tenantId, species: "dog" })
      .limit(1)
      .single(),
  );
  petPool = (
    await must(
      admin
        .from("pets")
        .insert(
          Array.from({ length: 12 }, (_, i) => ({
            tenant_id: tenantId,
            customer_id: customerId,
            name: `Perro ${i + 1}`,
            species: "dog" as const,
            breed_id: breed.id,
          })),
        )
        .select("id"),
    )
  ).map((p) => p.id);

  const service = async (name: string, kind: "bath" | "special_cut" | "other") =>
    (
      await must(
        admin
          .from("services")
          .insert({ tenant_id: tenantId, name, kind, species: "dog" })
          .select("id")
          .single(),
      )
    ).id;
  bath = await service("Baño", "bath");
  breedCut = await service("Corte de raza", "special_cut");
  nailCut = await service("Corte de uñas", "other");
  const durations = (["S", "M", "L"] as const).flatMap((size) =>
    (["short", "medium", "long"] as const).flatMap((coat) => [
      {
        tenant_id: tenantId,
        service_id: bath,
        size,
        coat,
        bath_min: 40,
        dry_min: 30,
        details_min: 20,
        cut_min: null,
      },
      {
        tenant_id: tenantId,
        service_id: breedCut,
        size,
        coat,
        bath_min: null,
        dry_min: null,
        details_min: null,
        cut_min: 60,
      },
      {
        tenant_id: tenantId,
        service_id: nailCut,
        size,
        coat,
        bath_min: null,
        dry_min: null,
        details_min: 15,
        cut_min: null,
      },
    ]),
  );
  await must(admin.from("service_durations").insert(durations));
  slowExtra = (
    await must(
      admin
        .from("extras")
        .insert({ tenant_id: tenantId, service_id: bath, name: "Hidratación", extra_minutes: 15 })
        .select("id")
        .single(),
    )
  ).id;
});

afterAll(async () => {
  await admin.from("tenants").delete().eq("id", tenantId);
  await deleteTestUsers([customer].filter(Boolean));
  await sql.end();
});

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
