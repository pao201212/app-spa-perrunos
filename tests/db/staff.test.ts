import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUsers,
  uniqueSuffix,
  type TestUser,
} from "./helpers";

const admin = adminClient();
const suffix = uniqueSuffix();

let tenantA: string;
let tenantB: string;
let staffUserA: TestUser;
let staffUserB: TestUser;
let northA: string;
let southA: string;
let locationB: string;
let groomer: string;

beforeAll(async () => {
  const { data, error } = await admin
    .from("tenants")
    .insert([
      { slug: `per-a-${suffix}`, name: "Personal A", is_active: true },
      { slug: `per-b-${suffix}`, name: "Personal B", is_active: true },
    ])
    .select("id, slug");
  if (error) throw error;
  tenantA = data.find((t) => t.slug.startsWith("per-a"))!.id;
  tenantB = data.find((t) => t.slug.startsWith("per-b"))!.id;
  [staffUserA, staffUserB] = await Promise.all([
    createTestUser("staff-per-a"),
    createTestUser("staff-per-b"),
  ]);
  await admin.from("memberships").insert([
    { tenant_id: tenantA, user_id: staffUserA.id, role: "admin" },
    { tenant_id: tenantB, user_id: staffUserB.id, role: "admin" },
  ]);
  const { data: locations } = await admin
    .from("locations")
    .insert([
      { tenant_id: tenantA, name: "Norte" },
      { tenant_id: tenantA, name: "Sur" },
      { tenant_id: tenantB, name: "Sede B" },
    ])
    .select("id, name");
  northA = locations!.find((l) => l.name === "Norte")!.id;
  southA = locations!.find((l) => l.name === "Sur")!.id;
  locationB = locations!.find((l) => l.name === "Sede B")!.id;
});

afterAll(async () => {
  await admin.from("tenants").delete().in("id", [tenantA, tenantB]);
  await deleteTestUsers([staffUserA, staffUserB].filter(Boolean));
});

describe("staff", () => {
  it("el staff del spa registra empleados con sus habilidades", async () => {
    const { data, error } = await staffUserA.client
      .from("staff")
      .insert({ tenant_id: tenantA, name: "Laura Groomer" })
      .select("id, is_active")
      .single();
    expect(error).toBeNull();
    expect(data!.is_active).toBe(true);
    groomer = data!.id;

    const skills = await staffUserA.client.from("staff_skills").insert([
      { tenant_id: tenantA, staff_id: groomer, skill: "finish" },
      { tenant_id: tenantA, staff_id: groomer, skill: "special_cut" },
    ]);
    expect(skills.error).toBeNull();
    const duplicate = await admin
      .from("staff_skills")
      .insert({ tenant_id: tenantA, staff_id: groomer, skill: "finish" });
    expect(duplicate.error?.code).toBe("23505");
  });

  it("no admite dos empleados con el mismo nombre en un spa", async () => {
    const { error } = await admin
      .from("staff")
      .insert({ tenant_id: tenantA, name: "laura groomer" });
    expect(error?.code).toBe("23505");
  });

  it("es información interna: ni anon ni el staff de otro spa la ven", async () => {
    const asAnon = await anonClient().from("staff").select("id").eq("tenant_id", tenantA);
    const asOther = await staffUserB.client.from("staff").select("id").eq("tenant_id", tenantA);
    expect(asAnon.data ?? []).toEqual([]);
    expect(asOther.data ?? []).toEqual([]);
  });

  it("no permite asignar habilidades o turnos cruzando spas (FK compuestas)", async () => {
    const skill = await admin
      .from("staff_skills")
      .insert({ tenant_id: tenantB, staff_id: groomer, skill: "bath" });
    expect(skill.error?.code).toBe("23503");
    const shift = await admin.from("staff_shifts").insert({
      tenant_id: tenantA,
      staff_id: groomer,
      location_id: locationB,
      weekday: 6,
      starts_at: "08:00",
      ends_at: "12:00",
    });
    expect(shift.error?.code).toBe("23503");
  });
});

describe("staff_shifts", () => {
  it("registra turnos por local, p. ej. un groomer que solo trabaja fines de semana", async () => {
    const { error } = await staffUserA.client.from("staff_shifts").insert([
      {
        tenant_id: tenantA,
        staff_id: groomer,
        location_id: northA,
        weekday: 6,
        starts_at: "08:00",
        ends_at: "12:00",
      },
      {
        tenant_id: tenantA,
        staff_id: groomer,
        location_id: southA,
        weekday: 6,
        starts_at: "13:00",
        ends_at: "17:00",
      },
      {
        tenant_id: tenantA,
        staff_id: groomer,
        location_id: northA,
        weekday: 0,
        starts_at: "09:00",
        ends_at: "13:00",
      },
    ]);
    expect(error).toBeNull();
  });

  it("una persona no puede tener turnos que se crucen, aunque sea en otro local", async () => {
    const { error } = await admin.from("staff_shifts").insert({
      tenant_id: tenantA,
      staff_id: groomer,
      location_id: southA,
      weekday: 6,
      starts_at: "11:00",
      ends_at: "14:00",
    });
    expect(error?.code).toBe("23P01");
  });

  it("el fin del turno debe ser posterior al inicio", async () => {
    const { error } = await admin.from("staff_shifts").insert({
      tenant_id: tenantA,
      staff_id: groomer,
      location_id: northA,
      weekday: 1,
      starts_at: "12:00",
      ends_at: "08:00",
    });
    expect(error).not.toBeNull();
  });
});

describe("staff_absences", () => {
  it("registra ausencias y valida el rango", async () => {
    const ok = await staffUserA.client.from("staff_absences").insert({
      tenant_id: tenantA,
      staff_id: groomer,
      starts_at: "2026-12-24T00:00:00-05:00",
      ends_at: "2026-12-27T00:00:00-05:00",
      reason: "Vacaciones",
    });
    expect(ok.error).toBeNull();
    const backwards = await admin.from("staff_absences").insert({
      tenant_id: tenantA,
      staff_id: groomer,
      starts_at: "2026-12-27T00:00:00-05:00",
      ends_at: "2026-12-24T00:00:00-05:00",
    });
    expect(backwards.error).not.toBeNull();
  });
});
