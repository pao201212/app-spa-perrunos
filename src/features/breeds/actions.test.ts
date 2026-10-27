import { describe, expect, it } from "vitest";

import { IDS } from "../../../tests/fixtures/dataset";
import {
  FAIL,
  form,
  IDLE,
  redirectOf,
  server,
  SUPER_ADMIN,
  UNIQUE,
  withSupabase,
} from "../../../tests/server-env";

import { deleteBreedAction, saveBreedAction } from "./actions";

const pug = form({ species: "dog", name: "Pug", default_size: "S", default_coat: "short" });
const criollo = form({
  species: "dog",
  name: "Criollo",
  default_size: "M",
  default_coat: "short",
  is_mixed: "on",
});

describe("catálogo global de razas", () => {
  it("crea, edita y borra razas", async () => {
    server.viewer = SUPER_ADMIN;
    withSupabase();
    expect(await redirectOf(() => saveBreedAction(null, IDLE, pug))).toBe("/razas");
    expect(await redirectOf(() => saveBreedAction(IDS.globalBreed, IDLE, pug))).toBe("/razas");
    expect(await redirectOf(() => deleteBreedAction(IDS.globalBreed))).toBe("/razas");
  });

  it("valida, avisa duplicados (también del criollo) y errores", async () => {
    server.viewer = SUPER_ADMIN;
    expect(await saveBreedAction(null, IDLE, form({ name: "" }))).toMatchObject({
      status: "error",
    });
    withSupabase({ writeError: UNIQUE });
    expect(await saveBreedAction(null, IDLE, pug)).toMatchObject({
      fieldErrors: { name: "Ya existe una raza con ese nombre para esa especie" },
    });
    expect(await saveBreedAction(null, IDLE, criollo)).toMatchObject({
      fieldErrors: { name: "Ya existe un criollo para esa especie" },
    });
    withSupabase({ writeError: FAIL });
    expect(await saveBreedAction(IDS.globalBreed, IDLE, pug)).toMatchObject({
      message: "No pudimos guardar la raza. Intenta de nuevo.",
    });
    await expect(deleteBreedAction(IDS.globalBreed)).rejects.toThrow("No pudimos eliminar la raza");
  });
});
