import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeSupabase } from "../../../tests/supabase-fake";

const requireCustomer = vi.fn();
vi.mock("@/lib/auth/customer", () => ({
  requireCustomer: (...args: unknown[]) => requireCustomer(...args),
}));
const tenantStaffContext = vi.fn();
vi.mock("@/lib/auth/tenant-context", () => ({
  tenantStaffContext: (...args: unknown[]) => tenantStaffContext(...args),
}));

const { bookAction, loadSlotsAction } = await import("./actions");
const { adminBookAction, adminLoadSlotsAction } = await import("./admin-actions");

const ID = "6f1c2a59-2a7f-4f63-9a59-0d1c0f0e8b11";
const PET = "7f1c2a59-2a7f-4f63-9a59-0d1c0f0e8b11";
const tenant = { id: ID, timezone: "America/Bogota" };
const selections = [{ petId: PET, serviceId: ID, cutId: null, extras: [], options: [] }];
const pets = { data: [{ id: PET, species: "dog", size: "M", coat: "short" }], error: null };

function as(kind: "customer" | "staff", fake: ReturnType<typeof fakeSupabase>) {
  const context = { tenant, customer: { id: ID }, supabase: fake.client };
  (kind === "customer" ? requireCustomer : tenantStaffContext).mockResolvedValue(context);
  return fake;
}

beforeEach(() => vi.clearAllMocks());

describe("loadSlotsAction (cliente)", () => {
  it("usa la talla y el pelo guardados y devuelve las horas en la zona del spa", async () => {
    const fake = as(
      "customer",
      fakeSupabase({
        tables: { pets },
        rpcs: {
          available_slots: {
            data: [
              {
                starts_at: "2026-11-02T13:00:00+00:00",
                estimated_ready_at: "2026-11-02T14:30:00+00:00",
              },
            ],
            error: null,
          },
        },
      }),
    );
    const result = await loadSlotsAction("spa", { locationId: ID, date: "2026-11-02", selections });
    expect(result).toEqual({
      ok: true,
      slots: [{ startsAt: "2026-11-02T13:00:00+00:00", time: "08:00", ready: "09:30" }],
    });
    expect(fake.client.rpc).toHaveBeenCalledWith("available_slots", {
      p_location_id: ID,
      p_date: "2026-11-02",
      p_pets: [{ species: "dog", size: "M", coat: "short", services: [ID], extras: [] }],
    });
  });

  it("rechaza mascotas que no son del cliente y datos inválidos", async () => {
    as("customer", fakeSupabase({ tables: { pets: { data: [], error: null } } }));
    expect(
      await loadSlotsAction("spa", { locationId: ID, date: "2026-11-02", selections }),
    ).toEqual({
      ok: false,
      message: "Revisa las mascotas elegidas.",
    });
    expect(
      await loadSlotsAction("spa", { locationId: "x", date: "2026-11-02", selections }),
    ).toMatchObject({ ok: false });
  });

  it("informa si la consulta falla", async () => {
    as(
      "customer",
      fakeSupabase({ tables: { pets }, rpcs: { available_slots: { data: null, error: {} } } }),
    );
    expect(
      await loadSlotsAction("spa", { locationId: ID, date: "2026-11-02", selections }),
    ).toEqual({
      ok: false,
      message: "No pudimos cargar las horas. Intenta de nuevo.",
    });
  });
});

const bookRequest = { locationId: ID, startsAt: "2026-11-02T13:00:00.000Z", selections, notes: "" };
const bookingRow = {
  code: "ABC234",
  status: "pending",
  estimated_ready_at: "2026-11-02T14:30:00+00:00",
  total_cop: 45000,
};

describe("bookAction (cliente)", () => {
  it("devuelve el código, la entrega y si queda pendiente", async () => {
    const fake = as(
      "customer",
      fakeSupabase({ rpcs: { book_appointment: { data: [bookingRow], error: null } } }),
    );
    expect(await bookAction("spa", bookRequest)).toEqual({
      ok: true,
      booking: { code: "ABC234", pending: true, ready: "09:30", total: 45000 },
    });
    expect(fake.client.rpc).toHaveBeenCalledWith("book_appointment", {
      p_location_id: ID,
      p_starts_at: bookRequest.startsAt,
      p_pets: [{ pet_id: PET, services: [ID], extras: [], options: [] }],
      p_notes: undefined,
    });
  });

  it("un cupo recién tomado pide volver a elegir hora", async () => {
    as(
      "customer",
      fakeSupabase({
        rpcs: { book_appointment: { data: null, error: { hint: "CUPO_LLENO", message: "x" } } },
      }),
    );
    expect(await bookAction("spa", bookRequest)).toEqual({
      ok: false,
      message: "Ese horario acaba de ocuparse. Elige otra hora.",
      slotTaken: true,
    });
  });

  it("valida la solicitud", async () => {
    as("customer", fakeSupabase());
    expect(await bookAction("spa", { ...bookRequest, startsAt: "mañana" })).toEqual({
      ok: false,
      message: "Revisa lo que elegiste.",
      slotTaken: false,
    });
  });
});

describe("acciones del admin", () => {
  it("ofrece horas libres y con sobrecupo, y descarta las que no lo admiten", async () => {
    as(
      "staff",
      fakeSupabase({
        tables: { pets },
        rpcs: {
          explain_slots: {
            data: [
              {
                starts_at: "2026-11-02T13:00:00+00:00",
                estimated_ready_at: "2026-11-02T14:30:00+00:00",
                code: null,
                detail: null,
                overridable: false,
              },
              {
                starts_at: "2026-11-02T13:15:00+00:00",
                estimated_ready_at: "2026-11-02T14:45:00+00:00",
                code: "SIN_ESPACIO",
                detail: { at: "2026-11-02T15:00:00+00:00", present: 6, max: 6 },
                overridable: true,
              },
              {
                starts_at: "2026-11-02T16:00:00+00:00",
                estimated_ready_at: "2026-11-02T17:30:00+00:00",
                code: "PASADO",
                detail: null,
                overridable: false,
              },
            ],
            error: null,
          },
        },
      }),
    );
    const result = await adminLoadSlotsAction("spa", ID, {
      locationId: ID,
      date: "2026-11-02",
      selections,
    });
    expect(result).toEqual({
      ok: true,
      slots: [
        {
          startsAt: "2026-11-02T13:00:00+00:00",
          time: "08:00",
          ready: "09:30",
          overbook: undefined,
        },
        {
          startsAt: "2026-11-02T13:15:00+00:00",
          time: "08:15",
          ready: "09:45",
          overbook: { label: "Sin espacio", message: "A las 10:00 ya hay 6 mascotas (máximo 6)" },
        },
      ],
    });
  });

  it("si ninguna hora se puede ofrecer, explica por qué", async () => {
    as(
      "staff",
      fakeSupabase({
        tables: { pets },
        rpcs: {
          explain_slots: {
            data: [
              {
                starts_at: null,
                estimated_ready_at: null,
                code: "CERRADO",
                detail: { reason: "Navidad" },
                overridable: false,
              },
            ],
            error: null,
          },
        },
      }),
    );
    expect(
      await adminLoadSlotsAction("spa", ID, { locationId: ID, date: "2026-12-25", selections }),
    ).toEqual({ ok: false, message: "El local cierra este día (Navidad)" });
  });

  it("crea la cita para el cliente con o sin sobrecupo", async () => {
    const fake = as(
      "staff",
      fakeSupabase({
        rpcs: { book_appointment: { data: [{ ...bookingRow, status: "scheduled" }], error: null } },
      }),
    );
    expect(await adminBookAction("spa", PET, bookRequest, true)).toMatchObject({
      ok: true,
      booking: { pending: false },
    });
    expect(fake.client.rpc).toHaveBeenCalledWith(
      "book_appointment",
      expect.objectContaining({ p_customer_id: PET, p_overbook: true }),
    );
  });

  it("traduce los errores de la reserva", async () => {
    as(
      "staff",
      fakeSupabase({
        rpcs: {
          book_appointment: {
            data: null,
            error: { hint: "MASCOTA_OCUPADA", message: "Esa mascota ya tiene una cita a esa hora" },
          },
        },
      }),
    );
    expect(await adminBookAction("spa", PET, bookRequest)).toEqual({
      ok: false,
      message: "Esa mascota ya tiene una cita a esa hora",
      slotTaken: false,
    });
  });
});
