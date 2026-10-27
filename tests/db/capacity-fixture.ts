import {
  adminClient,
  createTestUser,
  deleteTestUsers,
  sqlClient,
  uniqueSuffix,
  type TestUser,
} from "./helpers";

// Spa de ejemplo de la capacidad simple (docs/capacidad.md §3.5), compartido por las pruebas de
// capacity.evaluate / available_slots / explain_slots (T37–T38) y capacity.book (T39).
//
// "Sede principal": L–V 08:00–12:00 y 13:00–17:00, sábado 08:00–13:00, domingo cerrado.
// Ana baña L–S, Beto baña L–V, Caro solo hace corte especial los sábados. Sala de espera: 4.
// Perro por empleado y día: pequeño 8/7/6, mediano 6/5/4, grande 4/3/3 (corto/medio/largo).
// Baño mediano corto: 40 + 30 + 20 = 90 min. Corte de raza: 60 min. Corte de uñas: 15 min.

export const admin = adminClient();
export const sql = sqlClient();
const suffix = uniqueSuffix();
export const TZ = "America/Bogota"; // UTC−5, sin horario de verano

export type Size = "S" | "M" | "L" | "XXL";
export type Coat = "short" | "medium" | "long";
export type Pet = {
  species?: "dog" | "cat";
  size: Size;
  coat: Coat;
  services: string[];
  extras?: string[];
};
export type Slot = { starts_at: string; estimated_ready_at: string };
export type Evaluation = {
  starts: string | null;
  ready: string | null;
  code: string | null;
  detail: unknown;
};

export let tenantId: string;
export let customer: TestUser;
export let staff: TestUser;
export let customerId: string;
export let petPool: string[];
export let bath: string;
export let breedCut: string;
export let nailCut: string;
export let slowExtra: string;
export let bathOption: string;
let locationCount = 0;

export const PER_STAFF: Record<"S" | "M" | "L", Record<Coat, number>> = {
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

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const MONDAY = nextMonday();
export const SATURDAY = addDays(MONDAY, 5);
export const SUNDAY = addDays(MONDAY, 6);
export const at = (date: string, time: string) => `${date}T${time}:00-05:00`;
export const local = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

export async function must<T>(
  query: PromiseLike<{ data: T; error: unknown }>,
): Promise<NonNullable<T>> {
  const { data, error } = await query;
  if (error) throw error;
  return data as NonNullable<T>;
}

export type Options = { beto?: "full" | "half" | "absent" | "none"; ana?: boolean };

/** Un local nuevo con el horario, el personal y la capacidad del ejemplo. */
export async function setupLocation({ beto = "full", ana = true }: Options = {}): Promise<string> {
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
export async function booked(
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

export const dog = (size: Size, coat: Coat, services = [bath], extras: string[] = []): Pet => ({
  species: "dog",
  size,
  coat,
  services,
  extras,
});
export const pets = (count: number, pet: Pet) => Array.from({ length: count }, () => pet);

export async function slots(locationId: string, date: string, request: Pet[]) {
  const data = await must(
    customer.client.rpc("available_slots", {
      p_location_id: locationId,
      p_date: date,
      p_pets: request,
    }),
  );
  return (data as Slot[]).map((s) => `${local(s.starts_at)}→${local(s.estimated_ready_at)}`);
}

export async function evaluate(
  locationId: string,
  date: string,
  request: Pet[],
): Promise<Evaluation[]> {
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

export async function evaluateAt(locationId: string, date: string, time: string, request: Pet[]) {
  const row = (await evaluate(locationId, date, request)).find((r) => r.starts === time);
  if (!row) throw new Error(`No hay hora candidata ${time}`);
  return row;
}

/** Crea el spa del ejemplo (servicios, duraciones, cliente con mascotas y un admin). */
export async function setupCapacityTenant(label: string) {
  const tenant = await must(
    admin
      .from("tenants")
      .insert({
        slug: `${label}-${suffix}`,
        name: "Capacidad simple",
        is_active: true,
        timezone: TZ,
      })
      .select("id")
      .single(),
  );
  tenantId = tenant.id;
  [customer, staff] = await Promise.all([
    createTestUser(`cliente-${label}`),
    createTestUser(`staff-${label}`),
  ]);
  await must(
    admin.from("memberships").insert({ tenant_id: tenantId, user_id: staff.id, role: "admin" }),
  );
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
  bathOption = (
    await must(
      admin
        .from("service_options")
        .insert({ tenant_id: tenantId, service_id: bath, name: "Moño", stage: "details" })
        .select("id")
        .single(),
    )
  ).id;
}

export async function teardownCapacityTenant() {
  await admin.from("tenants").delete().eq("id", tenantId);
  await deleteTestUsers([customer, staff].filter(Boolean));
  await sql.end();
}
