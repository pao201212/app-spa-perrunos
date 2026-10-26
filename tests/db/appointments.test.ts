import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUsers,
  uniqueSuffix,
  type TestUser,
} from "./helpers";

// T35 · Capacidad simple (D31, D33) y citas: RLS y datos congelados.

const admin = adminClient();
const suffix = uniqueSuffix();

let tenantA: string;
let tenantB: string;
let locationA: string;
let serviceA: string;
let optionA: string;
let staffA: TestUser;
let staffB: TestUser;
let clientX: TestUser;
let clientY: TestUser;
let appointmentX: string;
let appointmentY: string;

async function must<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await query;
  if (error) throw error;
  return data as NonNullable<T>;
}

/** Cliente con una mascota y una cita de baño en el local A. */
async function seedCustomerAppointment(user: TestUser, name: string, breed: string) {
  const customer = await must(
    admin
      .from("customers")
      .insert({ tenant_id: tenantA, user_id: user.id, full_name: name })
      .select("id")
      .single(),
  );
  const pet = await must(
    admin
      .from("pets")
      .insert({
        tenant_id: tenantA,
        customer_id: customer.id,
        name: `Mascota ${name}`,
        species: "dog",
        breed_id: breed,
      })
      .select("id")
      .single(),
  );
  const appointment = await must(
    admin
      .from("appointments")
      .insert({
        tenant_id: tenantA,
        location_id: locationA,
        customer_id: customer.id,
        status: "scheduled",
        starts_at: "2026-12-21T13:00:00Z",
        estimated_ready_at: "2026-12-21T14:30:00Z",
        total_cop: 50000,
        source: "web",
      })
      .select("id")
      .single(),
  );
  const petRow = { tenant_id: tenantA, appointment_id: appointment.id, pet_id: pet.id };
  await must(
    admin
      .from("appointment_pets")
      .insert({ ...petRow, species: "dog", size: "M", coat: "short", quota_divisor: 6 }),
  );
  await must(
    admin.from("appointment_items").insert([
      {
        ...petRow,
        item_type: "service",
        service_id: serviceA,
        option_id: null,
        name: "Baño",
        price_cop: 50000,
      },
      {
        ...petRow,
        item_type: "option",
        service_id: null,
        option_id: optionA,
        name: "Moño",
        price_cop: 0,
      },
    ]),
  );
  return { appointment: appointment.id, pet: pet.id };
}

beforeAll(async () => {
  const tenants = await must(
    admin
      .from("tenants")
      .insert([
        { slug: `cita-a-${suffix}`, name: "Citas A", is_active: true },
        { slug: `cita-b-${suffix}`, name: "Citas B", is_active: true },
      ])
      .select("id, slug"),
  );
  tenantA = tenants.find((t) => t.slug.startsWith("cita-a"))!.id;
  tenantB = tenants.find((t) => t.slug.startsWith("cita-b"))!.id;
  [staffA, staffB, clientX, clientY] = await Promise.all([
    createTestUser("staff-cita-a"),
    createTestUser("staff-cita-b"),
    createTestUser("cliente-cita-x"),
    createTestUser("cliente-cita-y"),
  ]);
  await must(
    admin.from("memberships").insert([
      { tenant_id: tenantA, user_id: staffA.id, role: "admin" },
      { tenant_id: tenantB, user_id: staffB.id, role: "admin" },
    ]),
  );
  locationA = (
    await must(
      admin
        .from("locations")
        .insert({ tenant_id: tenantA, name: "Sede citas" })
        .select("id")
        .single(),
    )
  ).id;
  serviceA = (
    await must(
      admin
        .from("services")
        .insert({ tenant_id: tenantA, kind: "bath", name: "Baño", species: "dog" })
        .select("id")
        .single(),
    )
  ).id;
  optionA = (
    await must(
      admin
        .from("service_options")
        .insert({ tenant_id: tenantA, service_id: serviceA, name: "Moño", stage: "details" })
        .select("id")
        .single(),
    )
  ).id;
  const breed = await must(
    admin
      .from("tenant_breeds")
      .select("id")
      .match({ tenant_id: tenantA, species: "dog" })
      .limit(1)
      .single(),
  );
  appointmentX = (await seedCustomerAppointment(clientX, "Cliente X", breed.id)).appointment;
  appointmentY = (await seedCustomerAppointment(clientY, "Cliente Y", breed.id)).appointment;
});

afterAll(async () => {
  await admin.from("tenants").delete().in("id", [tenantA, tenantB]);
  await deleteTestUsers([staffA, staffB, clientX, clientY].filter(Boolean));
});

describe("capacity_mode (D28, D30)", () => {
  it("los locales nuevos usan la capacidad simple", async () => {
    const { data } = await admin
      .from("locations")
      .select("capacity_mode")
      .eq("id", locationA)
      .single();
    expect(data).toEqual({ capacity_mode: "simple" });
  });

  it("solo existen los modos simple y avanzada", async () => {
    const { error } = await admin
      .from("locations")
      .update({ capacity_mode: "daily_quota" as never })
      .eq("id", locationA);
    expect(error?.code).toBe("22P02");
  });
});

describe("location_pet_capacity (D31)", () => {
  const row = () => ({
    tenant_id: tenantA,
    location_id: locationA,
    species: "dog" as const,
    size: "L" as const,
    coat: "long" as const,
  });

  it("el staff guarda cuántas mascotas atiende un empleado al día", async () => {
    const { error } = await staffA.client
      .from("location_pet_capacity")
      .upsert({ ...row(), pets_per_staff: 4 });
    expect(error).toBeNull();
    const { data } = await staffA.client
      .from("location_pet_capacity")
      .select("pets_per_staff")
      .match(row())
      .single();
    expect(data).toEqual({ pets_per_staff: 4 });
  });

  it("rechaza 0 mascotas por empleado", async () => {
    const { error } = await staffA.client
      .from("location_pet_capacity")
      .upsert({ ...row(), pets_per_staff: 0 });
    expect(error?.code).toBe("23514");
  });

  it("replace_location_pet_capacity reemplaza la matriz completa; otro spa no puede", async () => {
    const rows = [{ species: "dog", size: "M", coat: "short", pets_per_staff: 6 }];
    const denied = await staffB.client.rpc("replace_location_pet_capacity", {
      p_location_id: locationA,
      p_rows: rows,
    });
    expect(denied.error?.code).toBe("42501");
    const { error } = await staffA.client.rpc("replace_location_pet_capacity", {
      p_location_id: locationA,
      p_rows: rows,
    });
    expect(error).toBeNull();
    const { data } = await staffA.client
      .from("location_pet_capacity")
      .select("species, size, coat, pets_per_staff")
      .eq("location_id", locationA);
    expect(data).toEqual(rows);
  });

  it("es interna: ni anon, ni clientes, ni el staff de otro spa la ven o la editan", async () => {
    for (const client of [anonClient(), clientX.client, staffB.client]) {
      const { data } = await client
        .from("location_pet_capacity")
        .select("pets_per_staff")
        .eq("location_id", locationA);
      expect(data ?? []).toEqual([]);
    }
    const { error } = await staffB.client
      .from("location_pet_capacity")
      .insert({ ...row(), size: "S", pets_per_staff: 8 });
    expect(error).not.toBeNull();
  });
});

describe("location_waiting_zones (D33)", () => {
  it("el staff registra zonas con puestos > 0 y nombre único por local", async () => {
    const zone = { tenant_id: tenantA, location_id: locationA };
    expect(
      (
        await staffA.client
          .from("location_waiting_zones")
          .insert({ ...zone, name: "Sala", seats: 4 })
      ).error,
    ).toBeNull();
    const duplicate = await staffA.client
      .from("location_waiting_zones")
      .insert({ ...zone, name: "sala", seats: 2 });
    expect(duplicate.error?.code).toBe("23505");
    const empty = await staffA.client
      .from("location_waiting_zones")
      .insert({ ...zone, name: "Patio", seats: 0 });
    expect(empty.error?.code).toBe("23514");
  });

  it("anon no ve las zonas", async () => {
    const { data } = await anonClient()
      .from("location_waiting_zones")
      .select("name")
      .eq("location_id", locationA);
    expect(data ?? []).toEqual([]);
  });
});

describe("appointments", () => {
  it("la cita recibe un código corto sin caracteres ambiguos", async () => {
    const { data } = await admin
      .from("appointments")
      .select("code")
      .eq("id", appointmentX)
      .single();
    expect(data!.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("el cliente ve solo su cita, sus mascotas y sus ítems", async () => {
    const { data: appointments } = await clientX.client.from("appointments").select("id");
    expect(appointments?.map((a) => a.id)).toEqual([appointmentX]);
    const { data: pets } = await clientX.client.from("appointment_pets").select("appointment_id");
    expect(pets?.map((p) => p.appointment_id)).toEqual([appointmentX]);
    const { data: items } = await clientX.client
      .from("appointment_items")
      .select("item_type, price_cop")
      .order("item_type");
    expect(items).toEqual([
      { item_type: "service", price_cop: 50000 },
      { item_type: "option", price_cop: 0 },
    ]);
  });

  it("nadie crea citas directamente por la API (solo capacity.book)", async () => {
    const base = await admin
      .from("appointments")
      .select("location_id, customer_id")
      .eq("id", appointmentX)
      .single();
    for (const client of [staffA.client, clientX.client]) {
      const { error } = await client.from("appointments").insert({
        tenant_id: tenantA,
        ...base.data!,
        status: "scheduled",
        starts_at: "2026-12-22T13:00:00Z",
        estimated_ready_at: "2026-12-22T14:00:00Z",
        total_cop: 0,
        source: "web",
      });
      expect(error?.code).toBe("42501");
    }
  });

  it("el cliente no cambia ni borra su cita", async () => {
    const updated = await clientX.client
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentX)
      .select();
    expect(updated.data ?? []).toEqual([]);
    const deleted = await clientX.client
      .from("appointments")
      .delete()
      .eq("id", appointmentX)
      .select();
    expect(deleted.data ?? []).toEqual([]);
  });

  it("el staff cambia estado, entrega y notas", async () => {
    const { data, error } = await staffA.client
      .from("appointments")
      .update({ status: "received", estimated_ready_at: "2026-12-21T15:00:00Z", notes: "Llegó" })
      .eq("id", appointmentY)
      .select("status, estimated_ready_at, notes")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({
      status: "received",
      estimated_ready_at: "2026-12-21T15:00:00+00:00",
      notes: "Llegó",
    });
  });

  it("el staff no altera lo congelado (hora, total) ni borra citas", async () => {
    for (const change of [{ starts_at: "2026-12-21T12:00:00Z" }, { total_cop: 1 }]) {
      const { error } = await staffA.client
        .from("appointments")
        .update(change)
        .eq("id", appointmentY);
      expect(error?.code, JSON.stringify(change)).toBe("42501");
    }
    const deleted = await staffA.client
      .from("appointments")
      .delete()
      .eq("id", appointmentY)
      .select();
    expect(deleted.data ?? []).toEqual([]);
  });

  it("el staff de otro spa no ve ni cambia las citas", async () => {
    const { data } = await staffB.client.from("appointments").select("id").eq("tenant_id", tenantA);
    expect(data ?? []).toEqual([]);
    const updated = await staffB.client
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentX)
      .select();
    expect(updated.data ?? []).toEqual([]);
  });

  it("la entrega es posterior al inicio y los opcionales no cobran", async () => {
    const early = await admin
      .from("appointments")
      .update({ estimated_ready_at: "2026-12-21T13:00:00Z" })
      .eq("id", appointmentX);
    expect(early.error?.code).toBe("23514");
    const paidOption = await admin
      .from("appointment_items")
      .update({ price_cop: 1000 })
      .match({ appointment_id: appointmentX, item_type: "option" });
    expect(paidOption.error?.code).toBe("23514");
  });

  it("no se borra un local que ya tiene citas", async () => {
    const { error } = await admin.from("locations").delete().eq("id", locationA);
    expect(error?.code).toBe("23503");
  });
});

describe("confirm_reception (HU-B5)", () => {
  it("el cliente confirma una sola vez y solo cuando el spa ya recibió a la mascota", async () => {
    await admin.from("appointments").update({ status: "scheduled" }).eq("id", appointmentX);
    const early = await clientX.client.rpc("confirm_reception", { p_appointment_id: appointmentX });
    expect(early.error?.code).toBe("22023");

    await admin.from("appointments").update({ status: "received" }).eq("id", appointmentX);
    const first = await clientX.client.rpc("confirm_reception", { p_appointment_id: appointmentX });
    expect(first.error).toBeNull();
    const again = await clientX.client.rpc("confirm_reception", { p_appointment_id: appointmentX });
    expect(again.data).toBe(first.data);
  });

  it("nadie confirma citas ajenas", async () => {
    await admin.from("appointments").update({ status: "received" }).eq("id", appointmentY);
    for (const client of [clientX.client, staffA.client]) {
      const { error } = await client.rpc("confirm_reception", { p_appointment_id: appointmentY });
      expect(error?.code).toBe("P0002");
    }
  });
});
