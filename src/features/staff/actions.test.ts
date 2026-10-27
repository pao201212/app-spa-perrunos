import { describe, expect, it } from "vitest";

import { IDS } from "../../../tests/fixtures/dataset";
import { has } from "../../../tests/supabase-fake";
import { FAIL, form, IDLE, redirectOf, UNIQUE, withSupabase } from "../../../tests/server-env";

import * as actions from "./actions";

const slug = "spa";
const P = IDS.staff;
const person = form({ name: "Ana", skills: ["bath", "dry"], is_active: "on" });
const failingSkills = {
  staff_skills: (ops: { method: string }[]) => ({
    data: null,
    error: has(ops as never, "insert") ? FAIL : null,
  }),
};

describe("personal", () => {
  it("crea a la persona con sus habilidades", async () => {
    const fake = withSupabase({ tables: { staff: { data: { id: P }, error: null } } });
    expect(await redirectOf(() => actions.createStaffAction(slug, IDLE, person))).toBe(
      `/admin/personal/${P}`,
    );
    expect(fake.calls).toContainEqual({
      table: "staff_skills",
      method: "insert",
      args: [
        [expect.objectContaining({ skill: "bath" }), expect.objectContaining({ skill: "dry" })],
      ],
    });
  });

  it("valida y maneja errores al crear", async () => {
    expect(await actions.createStaffAction(slug, IDLE, form({ name: "Ana" }))).toMatchObject({
      fieldErrors: { skills: "Elige al menos una habilidad" },
    });
    withSupabase({ writeError: UNIQUE });
    expect(await actions.createStaffAction(slug, IDLE, person)).toMatchObject({
      fieldErrors: { name: "Ya hay una persona con ese nombre" },
    });
    withSupabase({ writeError: FAIL });
    expect(await actions.createStaffAction(slug, IDLE, person)).toMatchObject({
      message: "No pudimos crear a la persona.",
    });
    withSupabase({ tables: { staff: { data: { id: P }, error: null }, ...failingSkills } });
    expect(await actions.createStaffAction(slug, IDLE, person)).toMatchObject({
      message: "La persona se creó, pero no sus habilidades.",
    });
  });

  it("actualiza datos y habilidades", async () => {
    withSupabase();
    expect(await actions.updateStaffAction(slug, P, IDLE, person)).toEqual({
      status: "success",
      message: "Datos guardados",
    });
    expect(await actions.updateStaffAction(slug, P, IDLE, form({ name: "" }))).toMatchObject({
      status: "error",
    });
    withSupabase({ writeError: UNIQUE });
    expect(await actions.updateStaffAction(slug, P, IDLE, person)).toMatchObject({
      fieldErrors: { name: "Ya hay una persona con ese nombre" },
    });
    withSupabase({ writeError: FAIL });
    expect(await actions.updateStaffAction(slug, P, IDLE, person)).toMatchObject({
      message: "No pudimos guardar los datos.",
    });
    withSupabase({ tables: failingSkills });
    expect(await actions.updateStaffAction(slug, P, IDLE, person)).toMatchObject({
      message: "No pudimos guardar las habilidades.",
    });
  });
});

describe("turnos y ausencias", () => {
  const shift = form({
    location_id: IDS.location,
    weekday: "1",
    starts_at: "08:00",
    ends_at: "17:00",
  });

  it("agrega turnos y avisa cruces", async () => {
    withSupabase();
    expect(await actions.addShiftAction(slug, P, IDLE, shift)).toEqual({
      status: "success",
      message: "Turno agregado",
      values: { location_id: IDS.location, weekday: "1" },
    });
    expect(await actions.addShiftAction(slug, P, IDLE, form({ location_id: "x" }))).toMatchObject({
      status: "error",
    });
    withSupabase({ writeError: { code: "23P01" } });
    expect(await actions.addShiftAction(slug, P, IDLE, shift)).toMatchObject({
      message: "Ese turno se cruza con otro de la misma persona.",
    });
    withSupabase({ writeError: FAIL });
    expect(await actions.addShiftAction(slug, P, IDLE, shift)).toMatchObject({
      message: "No pudimos agregar el turno.",
    });
  });

  it("agrega ausencias en la hora del spa", async () => {
    const fake = withSupabase();
    const absence = form({
      starts_at: "2026-12-24T08:00",
      ends_at: "2026-12-24T17:00",
      reason: "Vacaciones",
    });
    expect(await actions.addAbsenceAction(slug, P, IDLE, absence)).toEqual({
      status: "success",
      message: "Ausencia agregada",
    });
    expect(fake.calls).toContainEqual({
      table: "staff_absences",
      method: "insert",
      args: [
        expect.objectContaining({
          starts_at: "2026-12-24T13:00:00.000Z",
          ends_at: "2026-12-24T22:00:00.000Z",
        }),
      ],
    });
    expect(await actions.addAbsenceAction(slug, P, IDLE, form({ starts_at: "x" }))).toMatchObject({
      status: "error",
    });
    withSupabase({ writeError: FAIL });
    expect(await actions.addAbsenceAction(slug, P, IDLE, absence)).toMatchObject({
      message: "No pudimos agregar la ausencia.",
    });
  });

  it("quita turnos y ausencias", async () => {
    const fake = withSupabase();
    await actions.removeShiftAction(slug, P, "sh1");
    await actions.removeAbsenceAction(slug, P, "ab1");
    expect(fake.calls.filter((c) => c.method === "delete").map((c) => c.table)).toEqual([
      "staff_shifts",
      "staff_absences",
    ]);
  });
});
