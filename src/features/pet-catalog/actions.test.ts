import { describe, expect, it } from "vitest";

import { IDS } from "../../../tests/fixtures/dataset";
import { FAIL, form, IDLE, redirectOf, UNIQUE, withSupabase } from "../../../tests/server-env";

import * as actions from "./actions";

const slug = "spa";
const sizes = { data: [{ size: "S" }, { size: "M" }], error: null };

describe("tallas por especie", () => {
  it("guarda los límites en orden", async () => {
    const fake = withSupabase({ tables: { size_thresholds: sizes } });
    expect(
      await actions.saveThresholdsAction(slug, "dog", IDLE, form({ S: "10", M: "20" })),
    ).toEqual({
      status: "success",
      message: "Tallas de perros guardadas",
    });
    expect(fake.calls).toContainEqual(
      expect.objectContaining({ table: "size_thresholds", method: "upsert" }),
    );
  });

  it("valida el orden y maneja errores", async () => {
    withSupabase({ tables: { size_thresholds: sizes } });
    expect(
      await actions.saveThresholdsAction(slug, "cat", IDLE, form({ S: "10", M: "5" })),
    ).toMatchObject({
      fieldErrors: { M: "Debe ser mayor que 10 kg (S)" },
    });
    withSupabase({ tables: { size_thresholds: { data: null, error: FAIL } } });
    expect(await actions.saveThresholdsAction(slug, "dog", IDLE, form({}))).toEqual({
      status: "error",
      message: "No pudimos leer las tallas actuales.",
    });
    const upsertFails = (error: object) => (ops: { method: string }[]) =>
      ops.some((o) => o.method === "upsert") ? { data: null, error } : sizes;
    withSupabase({
      tables: { size_thresholds: upsertFails({ code: "23514", message: "Rango inválido" }) },
    });
    expect(
      await actions.saveThresholdsAction(slug, "dog", IDLE, form({ S: "10", M: "20" })),
    ).toMatchObject({
      message: "Rango inválido",
    });
    withSupabase({ tables: { size_thresholds: upsertFails(FAIL) } });
    expect(
      await actions.saveThresholdsAction(slug, "dog", IDLE, form({ S: "10", M: "20" })),
    ).toMatchObject({
      message: "No pudimos guardar las tallas.",
    });
  });
});

describe("razas del spa", () => {
  const own = form({ species: "dog", name: "Pastor alemán", size: "L", coat: "medium" });

  it("crea razas propias", async () => {
    withSupabase();
    expect(await redirectOf(() => actions.createOwnBreedAction(slug, IDLE, own))).toBe(
      "/admin/razas",
    );
    expect(await actions.createOwnBreedAction(slug, IDLE, form({ name: "P" }))).toMatchObject({
      status: "error",
    });
    withSupabase({ writeError: UNIQUE });
    expect(await actions.createOwnBreedAction(slug, IDLE, own)).toMatchObject({
      fieldErrors: { name: "Ya existe una raza con ese nombre para esa especie" },
    });
    withSupabase({ writeError: FAIL });
    expect(await actions.createOwnBreedAction(slug, IDLE, own)).toMatchObject({
      message: "No pudimos crear la raza.",
    });
  });

  it("edita, restaura y borra razas", async () => {
    const edit = form({ size: "M", coat: "short", is_active: "on" });
    withSupabase();
    expect(
      await redirectOf(() => actions.updateTenantBreedAction(slug, IDS.breed, IDLE, edit)),
    ).toBe("/admin/razas");
    expect(
      await actions.updateTenantBreedAction(slug, IDS.breed, IDLE, form({ size: "Z" })),
    ).toMatchObject({
      status: "error",
    });
    expect(await redirectOf(() => actions.resetTenantBreedAction(slug, IDS.breed))).toBe(
      "/admin/razas",
    );
    expect(await redirectOf(() => actions.deleteOwnBreedAction(slug, IDS.breed))).toBe(
      "/admin/razas",
    );
    withSupabase({ writeError: FAIL, rpcError: FAIL });
    expect(await actions.updateTenantBreedAction(slug, IDS.breed, IDLE, edit)).toMatchObject({
      message: "No pudimos guardar la raza.",
    });
    await expect(actions.resetTenantBreedAction(slug, IDS.breed)).rejects.toThrow(
      "No pudimos restaurar la raza",
    );
    await expect(actions.deleteOwnBreedAction(slug, IDS.breed)).rejects.toThrow(
      "No pudimos eliminar la raza",
    );
  });
});
