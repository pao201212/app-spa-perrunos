import { describe, expect, it } from "vitest";

import { IDS } from "../../../tests/fixtures/dataset";
import { FAIL, form, IDLE, redirectOf, UNIQUE, withSupabase } from "../../../tests/server-env";

import * as actions from "./actions";

const slug = "spa";
const L = IDS.location;
const idle = IDLE;
const unique = UNIQUE;
const broken = FAIL;

describe("locales", () => {
  it("crea el local y redirige a su detalle", async () => {
    withSupabase({ tables: { locations: { data: { id: L }, error: null } } });
    expect(
      await redirectOf(() =>
        actions.createLocationAction(slug, idle, form({ name: "Sede Norte", whatsapp: "" })),
      ),
    ).toBe(`/admin/locales/${L}`);
  });

  it("valida, avisa nombres repetidos y errores al crear", async () => {
    expect(await actions.createLocationAction(slug, idle, form({ name: "" }))).toMatchObject({
      status: "error",
      fieldErrors: { name: expect.any(String) },
    });
    withSupabase({ writeError: unique });
    expect(
      await actions.createLocationAction(slug, idle, form({ name: "Sede Norte" })),
    ).toMatchObject({
      fieldErrors: { name: "Ya hay un local con ese nombre" },
    });
    withSupabase({ writeError: broken });
    expect(
      await actions.createLocationAction(slug, idle, form({ name: "Sede Norte" })),
    ).toMatchObject({
      message: "No pudimos crear el local. Intenta de nuevo.",
    });
  });

  it("actualiza los datos del local", async () => {
    const good = form({ name: "Sede Norte", is_active: "on" });
    withSupabase();
    expect(await actions.updateLocationDetailsAction(slug, L, idle, good)).toEqual({
      status: "success",
      message: "Datos guardados",
    });
    expect(
      await actions.updateLocationDetailsAction(slug, L, idle, form({ name: "" })),
    ).toMatchObject({
      status: "error",
    });
    withSupabase({ writeError: unique });
    expect(await actions.updateLocationDetailsAction(slug, L, idle, good)).toMatchObject({
      fieldErrors: { name: "Ya hay un local con ese nombre" },
    });
    withSupabase({ writeError: broken });
    expect(await actions.updateLocationDetailsAction(slug, L, idle, good)).toMatchObject({
      message: "No pudimos guardar los datos.",
    });
  });

  it("guarda los ajustes de reserva", async () => {
    const good = form({
      confirmation_mode: "manual",
      cancel_window_hours: "4",
      max_days_ahead: "30",
      slot_step_min: "15",
      bather_continues_drying: "on",
    });
    withSupabase();
    expect(await actions.updateBookingSettingsAction(slug, L, idle, good)).toEqual({
      status: "success",
      message: "Ajustes guardados",
    });
    expect(
      await actions.updateBookingSettingsAction(slug, L, idle, form({ slot_step_min: "7" })),
    ).toMatchObject({ status: "error" });
    withSupabase({ writeError: broken });
    expect(await actions.updateBookingSettingsAction(slug, L, idle, good)).toMatchObject({
      message: "No pudimos guardar los ajustes.",
    });
  });
});

describe("estaciones", () => {
  it("agrega con nombre automático y conserva el tipo", async () => {
    withSupabase({
      tables: {
        stations: (ops) =>
          ops.some((o) => o.method === "select" && o.args[1])
            ? { data: null, error: null, count: 1 }
            : { data: [{ id: "s1", name: "Mesa 1" }], error: null },
      },
    });
    expect(
      await actions.saveStationAction(
        slug,
        L,
        null,
        idle,
        form({ kind: "table", for_special_cut: "on" }),
      ),
    ).toEqual({
      status: "success",
      message: "Mesa 2 agregada",
      values: { kind: "table", for_special_cut: "on" },
    });
  });

  it("edita una estación y maneja errores", async () => {
    withSupabase();
    expect(
      await actions.saveStationAction(
        slug,
        L,
        "s1",
        idle,
        form({ name: "Mesa grande", kind: "table" }),
      ),
    ).toEqual({ status: "success", message: "Estación guardada" });
    expect(
      await actions.saveStationAction(slug, L, "s1", idle, form({ kind: "silla" })),
    ).toMatchObject({
      status: "error",
    });
    for (const [id, error, expected] of [
      ["s1", unique, { fieldErrors: { name: "Ya hay una estación con ese nombre en este local" } }],
      ["s1", broken, { message: "No pudimos guardar la estación." }],
      [null, unique, { fieldErrors: { name: "Ya hay una estación con ese nombre en este local" } }],
      [null, broken, { message: "No pudimos agregar la estación." }],
    ] as const) {
      withSupabase({ writeError: error });
      expect(
        await actions.saveStationAction(slug, L, id, idle, form({ name: "Tina 1", kind: "tub" })),
      ).toMatchObject(expected);
    }
  });

  it("quita estaciones, tramos, cierres y zonas", async () => {
    const fake = withSupabase();
    await actions.removeStationAction(slug, L, "s1");
    await actions.removeHourRangeAction(slug, L, "h1");
    await actions.removeClosureAction(slug, L, "c1");
    await actions.removeWaitingZoneAction(slug, L, "z1");
    expect(fake.calls.filter((c) => c.method === "delete").map((c) => c.table)).toEqual([
      "stations",
      "location_hours",
      "location_closures",
      "location_waiting_zones",
    ]);
  });
});

describe("horario, cierres, capacidad y zonas", () => {
  it("agrega tramos y rechaza cruces", async () => {
    const good = form({ weekday: "1", opens_at: "08:00", closes_at: "12:00" });
    withSupabase();
    expect(await actions.addHourRangeAction(slug, L, idle, good)).toEqual({
      status: "success",
      message: "Tramo agregado",
      values: { weekday: "1" },
    });
    expect(
      await actions.addHourRangeAction(
        slug,
        L,
        idle,
        form({ weekday: "1", opens_at: "12:00", closes_at: "08:00" }),
      ),
    ).toMatchObject({ status: "error" });
    withSupabase({ writeError: { code: "23P01" } });
    expect(await actions.addHourRangeAction(slug, L, idle, good)).toMatchObject({
      message: "Ese tramo se cruza con otro del mismo día.",
    });
    withSupabase({ writeError: broken });
    expect(await actions.addHourRangeAction(slug, L, idle, good)).toMatchObject({
      message: "No pudimos agregar el tramo.",
    });
  });

  it("agrega días de cierre", async () => {
    const good = form({ date: "2026-12-25", reason: "Navidad" });
    withSupabase();
    expect(await actions.addClosureAction(slug, L, idle, good)).toEqual({
      status: "success",
      message: "Cierre agregado",
    });
    expect(await actions.addClosureAction(slug, L, idle, form({ date: "" }))).toMatchObject({
      status: "error",
    });
    withSupabase({ writeError: unique });
    expect(await actions.addClosureAction(slug, L, idle, good)).toMatchObject({
      fieldErrors: { date: "Ese día ya está marcado como cierre" },
    });
    withSupabase({ writeError: broken });
    expect(await actions.addClosureAction(slug, L, idle, good)).toMatchObject({
      message: "No pudimos agregar el cierre.",
    });
  });

  it("guarda la matriz de capacidad", async () => {
    const fake = withSupabase();
    expect(
      await actions.saveCapacityAction(
        slug,
        L,
        idle,
        form({ "c.dog.M.short": "6", "c.dog.L.short": "4" }),
      ),
    ).toMatchObject({ status: "success", message: "Capacidad guardada (2 combinaciones)" });
    expect(fake.client.rpc).toHaveBeenCalledWith(
      "replace_location_pet_capacity",
      expect.anything(),
    );
    expect(
      await actions.saveCapacityAction(slug, L, idle, form({ "c.dog.S.short": "1" })),
    ).toMatchObject({
      message: "Capacidad guardada (1 combinación)",
    });
    expect(
      await actions.saveCapacityAction(slug, L, idle, form({ "c.dog.M.short": "0" })),
    ).toMatchObject({
      status: "error",
      message: "Revisa las celdas marcadas.",
    });
    withSupabase({ rpcError: broken });
    expect(
      await actions.saveCapacityAction(slug, L, idle, form({ "c.dog.M.short": "6" })),
    ).toMatchObject({
      message: "No pudimos guardar la capacidad.",
    });
  });

  it("agrega zonas de espera", async () => {
    const good = form({ name: "Sala", seats: "4" });
    withSupabase();
    expect(await actions.addWaitingZoneAction(slug, L, idle, good)).toEqual({
      status: "success",
      message: "Sala agregada",
    });
    expect(
      await actions.addWaitingZoneAction(slug, L, idle, form({ name: "S", seats: "0" })),
    ).toMatchObject({
      status: "error",
    });
    withSupabase({ writeError: unique });
    expect(await actions.addWaitingZoneAction(slug, L, idle, good)).toMatchObject({
      fieldErrors: { name: "Ya hay una zona con ese nombre" },
    });
    withSupabase({ writeError: broken });
    expect(await actions.addWaitingZoneAction(slug, L, idle, good)).toMatchObject({
      message: "No pudimos agregar la zona.",
    });
  });

  it("aplica la configuración a los demás locales", async () => {
    withSupabase({ rpcs: { apply_location_settings: { data: 2, error: null } } });
    expect(
      await actions.applyToAllLocationsAction(
        slug,
        L,
        idle,
        form({ sections: ["booking", "hours"] }),
      ),
    ).toEqual({ status: "success", message: "Configuración aplicada a 2 locales" });
    withSupabase({ rpcs: { apply_location_settings: { data: 1, error: null } } });
    expect(
      await actions.applyToAllLocationsAction(slug, L, idle, form({ sections: "stations" })),
    ).toMatchObject({ message: "Configuración aplicada a 1 local" });
    expect(await actions.applyToAllLocationsAction(slug, L, idle, form({}))).toMatchObject({
      status: "error",
      message: "Elige al menos una sección para aplicar",
    });
    withSupabase({ rpcError: broken });
    expect(
      await actions.applyToAllLocationsAction(slug, L, idle, form({ sections: "booking" })),
    ).toMatchObject({ message: "No pudimos aplicar la configuración. Intenta de nuevo." });
  });
});
