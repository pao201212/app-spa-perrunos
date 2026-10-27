import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeSupabase } from "../../../tests/supabase-fake";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
const requireCustomer = vi.fn();
vi.mock("@/lib/auth/customer", () => ({
  requireCustomer: (...args: unknown[]) => requireCustomer(...args),
}));
const tenantStaffContext = vi.fn();
vi.mock("@/lib/auth/tenant-context", () => ({
  tenantStaffContext: (...args: unknown[]) => tenantStaffContext(...args),
}));

const { confirmReceptionAction } = await import("./actions");
const { adjustReadyAction, changeStatusAction } = await import("./admin-actions");

const tenant = { id: "t1", timezone: "America/Bogota" };
const idle = { status: "idle" as const };
const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("confirmReceptionAction", () => {
  it("confirma la recepción", async () => {
    const fake = fakeSupabase({
      rpcs: { confirm_reception: { data: "2026-11-02T13:30:00Z", error: null } },
    });
    requireCustomer.mockResolvedValue({ supabase: fake.client });
    expect(await confirmReceptionAction("spa", "a1", idle)).toEqual({
      status: "success",
      message: "¡Gracias! Confirmaste la recepción.",
    });
    expect(fake.client.rpc).toHaveBeenCalledWith("confirm_reception", { p_appointment_id: "a1" });
  });

  it("muestra el motivo si aún no se puede", async () => {
    const fake = fakeSupabase({
      rpcs: {
        confirm_reception: {
          data: null,
          error: { message: "El spa aún no ha recibido a tu mascota" },
        },
      },
    });
    requireCustomer.mockResolvedValue({ supabase: fake.client });
    expect(await confirmReceptionAction("spa", "a1", idle)).toEqual({
      status: "error",
      message: "El spa aún no ha recibido a tu mascota",
    });
  });
});

describe("changeStatusAction", () => {
  it("avanza al siguiente estado permitido", async () => {
    const fake = fakeSupabase({ tables: { appointments: { data: null, error: null } } });
    tenantStaffContext.mockResolvedValue({ tenant, supabase: fake.client });
    expect(
      await changeStatusAction("spa", "a1", "scheduled", idle, form({ to: "received" })),
    ).toEqual({
      status: "success",
      message: "Estado: Recibida",
    });
    expect(fake.calls).toContainEqual({
      table: "appointments",
      method: "update",
      args: [{ status: "received" }],
    });
  });

  it("no intenta cambios fuera del flujo y avisa si falla", async () => {
    const fake = fakeSupabase({ tables: { appointments: { data: null, error: { code: "x" } } } });
    tenantStaffContext.mockResolvedValue({ tenant, supabase: fake.client });
    expect(await changeStatusAction("spa", "a1", "scheduled", idle, form({ to: "ready" }))).toEqual(
      {
        status: "error",
        message: "Ese cambio no es posible.",
      },
    );
    expect(fake.client.from).not.toHaveBeenCalled();
    expect(await changeStatusAction("spa", "a1", "ready", idle, form({ to: "delivered" }))).toEqual(
      {
        status: "error",
        message: "No pudimos cambiar el estado.",
      },
    );
  });
});

describe("adjustReadyAction", () => {
  it("guarda la nueva entrega en UTC", async () => {
    const fake = fakeSupabase({ tables: { appointments: { data: null, error: null } } });
    tenantStaffContext.mockResolvedValue({ tenant, supabase: fake.client });
    expect(
      await adjustReadyAction("spa", "a1", "2026-11-02", idle, form({ ready: "10:15" })),
    ).toEqual({
      status: "success",
      message: "Entrega ajustada a 10:15",
    });
    expect(fake.calls).toContainEqual({
      table: "appointments",
      method: "update",
      args: [{ estimated_ready_at: "2026-11-02T15:15:00.000Z" }],
    });
  });

  it("valida el formato y que sea después de la llegada", async () => {
    tenantStaffContext.mockResolvedValue({ tenant, supabase: fakeSupabase().client });
    expect(
      await adjustReadyAction("spa", "a1", "2026-11-02", idle, form({ ready: "10h" })),
    ).toEqual({
      status: "error",
      fieldErrors: { ready: "Usa el formato HH:MM" },
    });
    const late = fakeSupabase({
      tables: { appointments: { data: null, error: { code: "23514" } } },
    });
    tenantStaffContext.mockResolvedValue({ tenant, supabase: late.client });
    expect(
      await adjustReadyAction("spa", "a1", "2026-11-02", idle, form({ ready: "07:00" })),
    ).toEqual({
      status: "error",
      fieldErrors: { ready: "Debe ser después de la llegada" },
    });
    const broken = fakeSupabase({ tables: { appointments: { data: null, error: { code: "x" } } } });
    tenantStaffContext.mockResolvedValue({ tenant, supabase: broken.client });
    expect(
      await adjustReadyAction("spa", "a1", "2026-11-02", idle, form({ ready: "11:00" })),
    ).toEqual({
      status: "error",
      message: "No pudimos ajustar la entrega.",
    });
  });
});
