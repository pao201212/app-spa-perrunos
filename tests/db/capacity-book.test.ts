import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  MONDAY,
  SUNDAY,
  addDays,
  admin,
  at,
  bath,
  bathOption,
  booked,
  breedCut,
  local,
  must,
  setupCapacityTenant,
  setupLocation,
  slowExtra,
  staff,
  teardownCapacityTenant,
  tenantId,
} from "./capacity-fixture";
import { createTestUser, deleteTestUsers, type TestUser } from "./helpers";

// T39 · capacity.book: atómica, con candado por local y día (S9), sobrecupo del admin y anti-abuso.

type Booking = {
  id: string;
  code: string;
  status: string;
  estimated_ready_at: string;
  total_cop: number;
  overbooked: boolean;
};
type Client = TestUser["client"];

const users: TestUser[] = [];

beforeAll(() => setupCapacityTenant("book"));
afterAll(async () => {
  await deleteTestUsers(users);
  await teardownCapacityTenant();
});

/** Cliente nuevo con su cuenta y `count` perros medianos de pelo corto. */
async function newCustomer(count = 1) {
  const user = await createTestUser("cliente-reserva");
  users.push(user);
  const customer = await must(
    admin
      .from("customers")
      .insert({ tenant_id: tenantId, user_id: user.id, full_name: "Cliente reserva" })
      .select("id")
      .single(),
  );
  const breed = await must(
    admin
      .from("tenant_breeds")
      .select("id")
      .match({ tenant_id: tenantId, species: "dog" })
      .limit(1)
      .single(),
  );
  const pets = await must(
    admin
      .from("pets")
      .insert(
        Array.from({ length: count }, (_, i) => ({
          tenant_id: tenantId,
          customer_id: customer.id,
          name: `Perro ${i + 1}`,
          species: "dog" as const,
          breed_id: breed.id,
          size: "M" as const,
          coat: "short" as const,
          size_locked: true,
        })),
      )
      .select("id"),
  );
  return { client: user.client, customerId: customer.id, pets: pets.map((p) => p.id) };
}

const bathFor = (petId: string, more: { extras?: string[]; options?: string[] } = {}) => ({
  pet_id: petId,
  services: [bath],
  extras: more.extras ?? [],
  options: more.options ?? [],
});

async function book(
  client: Client,
  locationId: string,
  startsAt: string,
  pets: ReturnType<typeof bathFor>[],
  admin: { customerId?: string; overbook?: boolean } = {},
) {
  const { data, error } = await client.rpc("book_appointment", {
    p_location_id: locationId,
    p_starts_at: startsAt,
    p_pets: pets,
    p_customer_id: admin.customerId,
    p_overbook: admin.overbook ?? false,
  });
  return { booking: (data as Booking[] | null)?.[0], error };
}

describe("book_appointment", () => {
  it("el cliente reserva: precios, opcionales y talla quedan congelados", async () => {
    const location = await setupLocation();
    const { client, pets } = await newCustomer();
    const { booking, error } = await book(client, location, at(MONDAY, "08:00"), [
      bathFor(pets[0], { extras: [slowExtra], options: [bathOption] }),
    ]);
    expect(error).toBeNull();
    expect(booking).toMatchObject({ status: "scheduled", total_cop: 50000, overbooked: false });
    expect(booking!.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(local(booking!.estimated_ready_at)).toBe("09:45"); // 90 min + 15 de la hidratación

    const items = await must(
      admin
        .from("appointment_items")
        .select("item_type, name, price_cop")
        .eq("appointment_id", booking!.id)
        .order("item_type"),
    );
    expect(items).toEqual([
      { item_type: "service", name: "Baño", price_cop: 40000 },
      { item_type: "extra", name: "Hidratación", price_cop: 10000 },
      { item_type: "option", name: "Moño", price_cop: 0 },
    ]);
    const frozen = await must(
      admin
        .from("appointment_pets")
        .select("size, coat, quota_divisor")
        .eq("appointment_id", booking!.id)
        .single(),
    );
    expect(frozen).toEqual({ size: "M", coat: "short", quota_divisor: 6 });
    const { data: appointment } = await admin
      .from("appointments")
      .select("source, created_by")
      .eq("id", booking!.id)
      .single();
    expect(appointment).toMatchObject({ source: "web" });
  });

  it("con confirmación manual la cita queda pendiente", async () => {
    const location = await setupLocation();
    await must(admin.from("locations").update({ confirmation_mode: "manual" }).eq("id", location));
    const { client, pets } = await newCustomer();
    const { booking } = await book(client, location, at(MONDAY, "08:00"), [bathFor(pets[0])]);
    expect(booking?.status).toBe("pending");
  });

  it("dos mascotas del mismo grupo quedan ligadas al grupo", async () => {
    const location = await setupLocation();
    const { client, customerId, pets } = await newCustomer(2);
    const { data: groupId, error: groupError } = await staff.client.rpc("create_pet_group", {
      p_customer_id: customerId,
      p_pet_ids: pets,
    });
    expect(groupError).toBeNull();
    const { booking } = await book(
      client,
      location,
      at(MONDAY, "08:00"),
      pets.map((p) => bathFor(p)),
    );
    const { data } = await admin
      .from("appointments")
      .select("pet_group_id")
      .eq("id", booking!.id)
      .single();
    expect(data?.pet_group_id).toBe(groupId);
  });

  it("baño + corte especial cuenta como un baño y alarga la entrega", async () => {
    const location = await setupLocation();
    const { client, pets } = await newCustomer();
    const { booking } = await book(client, location, at(MONDAY, "08:00"), [
      { ...bathFor(pets[0]), services: [bath, breedCut] },
    ]);
    expect(local(booking!.estimated_ready_at)).toBe("10:30");
    expect(booking!.total_cop).toBe(80000);
  });

  it("rechaza horas fuera del horario, días cerrados y mascotas ocupadas", async () => {
    const location = await setupLocation();
    const { client, pets } = await newCustomer();
    const lunch = await book(client, location, at(MONDAY, "12:15"), [bathFor(pets[0])]);
    expect(lunch.error?.hint).toBe("HORA_INVALIDA");
    const sunday = await book(client, location, at(SUNDAY, "08:00"), [bathFor(pets[0])]);
    expect(sunday.error?.hint).toBe("CERRADO");
    const late = await book(client, location, at(MONDAY, "15:45"), [bathFor(pets[0])]);
    expect(late.error?.hint).toBe("FUERA_DE_HORARIO");

    expect(
      (await book(client, location, at(MONDAY, "08:00"), [bathFor(pets[0])])).error,
    ).toBeNull();
    const twice = await book(client, location, at(MONDAY, "09:00"), [bathFor(pets[0])]);
    expect(twice.error?.hint).toBe("MASCOTA_OCUPADA");
  });

  it("el cliente solo reserva sus mascotas, sin sobrecupo, con opcionales válidos", async () => {
    const location = await setupLocation();
    const mine = await newCustomer();
    const other = await newCustomer();
    const foreign = await book(mine.client, location, at(MONDAY, "08:00"), [
      bathFor(other.pets[0]),
    ]);
    expect(foreign.error?.code).toBe("22023");
    const overbook = await book(
      mine.client,
      location,
      at(MONDAY, "08:00"),
      [bathFor(mine.pets[0])],
      {
        overbook: true,
      },
    );
    expect(overbook.error?.code).toBe("42501");
    const option = await book(mine.client, location, at(MONDAY, "08:00"), [
      { ...bathFor(mine.pets[0]), services: [breedCut], options: [bathOption] },
    ]);
    expect(option.error?.code).toBe("22023");
  });

  it("el admin reserva para un cliente y puede usar sobrecupo, que queda marcado", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "08:00", "09:30", [
      { size: "L", count: 4 },
      { size: "M", count: 6 },
    ]);
    const { customerId, pets } = await newCustomer();
    const missing = await book(staff.client, location, at(MONDAY, "13:00"), [bathFor(pets[0])]);
    expect(missing.error?.code).toBe("22023");

    const full = await book(staff.client, location, at(MONDAY, "13:00"), [bathFor(pets[0])], {
      customerId,
    });
    expect(full.error).toMatchObject({
      hint: "CUPO_LLENO",
      message: "Ese horario acaba de ocuparse",
    });

    const forced = await book(staff.client, location, at(MONDAY, "13:00"), [bathFor(pets[0])], {
      customerId,
      overbook: true,
    });
    expect(forced.error).toBeNull();
    expect(forced.booking).toMatchObject({ status: "scheduled", overbooked: true });
    const { data } = await admin
      .from("appointments")
      .select("source, overbooked")
      .eq("id", forced.booking!.id)
      .single();
    expect(data).toEqual({ source: "admin", overbooked: true });
  });

  it("anti-abuso: máximo 5 reservas en 5 minutos", async () => {
    const location = await setupLocation();
    const { client, pets } = await newCustomer(6);
    for (const [i, pet] of pets.slice(0, 5).entries()) {
      const { error } = await book(client, location, at(addDays(MONDAY, i), "08:00"), [
        bathFor(pet),
      ]);
      expect(error, `reserva ${i + 1}`).toBeNull();
    }
    const sixth = await book(client, location, at(MONDAY, "13:00"), [bathFor(pets[5])]);
    expect(sixth.error?.hint).toBe("LIMITE_RESERVAS");
  });

  it("anti-abuso: máximo 10 citas activas", async () => {
    const location = await setupLocation();
    const { client, customerId, pets } = await newCustomer();
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    await must(
      admin.from("appointments").insert(
        Array.from({ length: 10 }, (_, i) => ({
          tenant_id: tenantId,
          location_id: location,
          customer_id: customerId,
          status: "scheduled" as const,
          starts_at: at(addDays(MONDAY, 7 + i), "08:00"),
          estimated_ready_at: at(addDays(MONDAY, 7 + i), "09:30"),
          total_cop: 0,
          source: "web" as const,
          created_at: hourAgo,
        })),
      ),
    );
    const { error } = await book(client, location, at(MONDAY, "08:00"), [bathFor(pets[0])]);
    expect(error).toMatchObject({ hint: "LIMITE_RESERVAS", message: "Ya tienes 10 citas activas" });
  });
});

describe("concurrencia (S9)", () => {
  it("queda ⅙ de jornada y 10 clientes piden un mediano a la vez: solo una cita se crea", async () => {
    const location = await setupLocation();
    await booked(location, MONDAY, "08:00", "09:30", [
      { size: "L", count: 4 },
      { size: "M", count: 5 },
    ]);
    const customers = await Promise.all(Array.from({ length: 10 }, () => newCustomer()));
    const results = await Promise.all(
      customers.map(({ client, pets }) =>
        book(client, location, at(MONDAY, "13:00"), [bathFor(pets[0])]),
      ),
    );
    const ok = results.filter((r) => r.error === null);
    expect(ok).toHaveLength(1);
    expect(new Set(results.filter((r) => r.error).map((r) => r.error!.hint))).toEqual(
      new Set(["CUPO_LLENO"]),
    );
    const { count } = await admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("location_id", location)
      .eq("source", "web");
    expect(count).toBe(1);
  });
});
