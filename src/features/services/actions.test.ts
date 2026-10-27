import { describe, expect, it } from "vitest";

import { IDS } from "../../../tests/fixtures/dataset";
import { FAIL, form, IDLE, redirectOf, UNIQUE, withSupabase } from "../../../tests/server-env";

import * as actions from "./actions";

const slug = "spa";
const S = IDS.bath;
const L = IDS.location;

describe("categorías", () => {
  it("crea, valida y avisa duplicados o errores; borra", async () => {
    const fake = withSupabase();
    expect(await actions.createCategoryAction(slug, IDLE, form({ name: "Baños" }))).toEqual({
      status: "success",
      message: "Categoría agregada",
    });
    expect(await actions.createCategoryAction(slug, IDLE, form({ name: "" }))).toMatchObject({
      status: "error",
    });
    await actions.deleteCategoryAction(slug, IDS.category);
    expect(fake.calls).toContainEqual(
      expect.objectContaining({ table: "service_categories", method: "delete" }),
    );
    withSupabase({ writeError: UNIQUE });
    expect(await actions.createCategoryAction(slug, IDLE, form({ name: "Baños" }))).toMatchObject({
      fieldErrors: { name: "Esa categoría ya existe" },
    });
    withSupabase({ writeError: FAIL });
    expect(await actions.createCategoryAction(slug, IDLE, form({ name: "Baños" }))).toMatchObject({
      message: "No pudimos crear la categoría.",
    });
  });
});

describe("servicios", () => {
  const good = form({
    name: "Baño",
    kind: "bath",
    species: "both",
    category_id: "",
    description: "",
  });

  it("crea el servicio y abre su detalle", async () => {
    withSupabase({ tables: { services: { data: { id: S }, error: null } } });
    expect(await redirectOf(() => actions.saveServiceAction(slug, null, IDLE, good))).toBe(
      `/admin/servicios/${S}`,
    );
  });

  it("edita sin cambiar el tipo y maneja errores", async () => {
    const fake = withSupabase();
    expect(await actions.saveServiceAction(slug, S, IDLE, good)).toEqual({
      status: "success",
      message: "Servicio guardado",
    });
    const update = fake.calls.find((c) => c.method === "update");
    expect(update?.args[0]).not.toHaveProperty("kind");
    expect(await actions.saveServiceAction(slug, S, IDLE, form({ name: "B" }))).toMatchObject({
      status: "error",
    });
    for (const [id, error, expected] of [
      [S, UNIQUE, { fieldErrors: { name: "Ya hay un servicio con ese nombre" } }],
      [S, FAIL, { message: "No pudimos guardar el servicio." }],
      [null, UNIQUE, { fieldErrors: { name: "Ya hay un servicio con ese nombre" } }],
      [null, FAIL, { message: "No pudimos crear el servicio." }],
    ] as const) {
      withSupabase({ writeError: error });
      expect(await actions.saveServiceAction(slug, id, IDLE, good)).toMatchObject(expected);
    }
  });
});

describe("extras y opcionales", () => {
  it("agrega extras, los activa o desactiva", async () => {
    const fake = withSupabase();
    expect(
      await actions.addExtraAction(
        slug,
        S,
        IDLE,
        form({ name: "Hidratación", extra_minutes: "15" }),
      ),
    ).toEqual({
      status: "success",
      message: "Extra agregado",
    });
    expect(
      await actions.addExtraAction(slug, S, IDLE, form({ name: "Hi", extra_minutes: "7" })),
    ).toMatchObject({
      status: "error",
    });
    await actions.toggleExtraAction(slug, S, IDS.extra, false);
    expect(fake.calls).toContainEqual({
      table: "extras",
      method: "update",
      args: [{ is_active: false }],
    });
    withSupabase({ writeError: UNIQUE });
    expect(
      await actions.addExtraAction(slug, S, IDLE, form({ name: "Hidratación" })),
    ).toMatchObject({
      fieldErrors: { name: "Ese extra ya existe" },
    });
    withSupabase({ writeError: FAIL });
    expect(
      await actions.addExtraAction(slug, S, IDLE, form({ name: "Hidratación" })),
    ).toMatchObject({
      message: "No pudimos agregar el extra.",
    });
  });

  it("agrega y borra opcionales sin costo", async () => {
    const fake = withSupabase();
    expect(
      await actions.addOptionAction(slug, S, IDLE, form({ name: "Moño", stage: "details" })),
    ).toEqual({
      status: "success",
      message: "Opcional agregado",
      values: { stage: "details" },
    });
    expect(
      await actions.addOptionAction(slug, S, IDLE, form({ name: "Moño", stage: "x" })),
    ).toMatchObject({
      status: "error",
    });
    await actions.deleteOptionAction(slug, S, IDS.option);
    expect(fake.calls).toContainEqual(
      expect.objectContaining({ table: "service_options", method: "delete" }),
    );
    withSupabase({ writeError: UNIQUE });
    expect(
      await actions.addOptionAction(slug, S, IDLE, form({ name: "Moño", stage: "bath" })),
    ).toMatchObject({
      fieldErrors: { name: "Ese opcional ya existe" },
    });
    withSupabase({ writeError: FAIL });
    expect(
      await actions.addOptionAction(slug, S, IDLE, form({ name: "Moño", stage: "bath" })),
    ).toMatchObject({
      message: "No pudimos agregar el opcional.",
    });
  });
});

describe("duraciones", () => {
  const cell = (stage: string, value: string) => ({ [`d.M.short.${stage}`]: value });

  it("guarda la matriz completa", async () => {
    const fake = withSupabase();
    expect(
      await actions.saveDurationsAction(
        slug,
        S,
        "bath",
        IDLE,
        form({ ...cell("bath_min", "40"), ...cell("dry_min", "30"), ...cell("details_min", "20") }),
      ),
    ).toMatchObject({ status: "success", message: "Duraciones guardadas (1 combinación)" });
    expect(fake.client.rpc).toHaveBeenCalledWith("replace_service_durations", expect.anything());
    expect(
      await actions.saveDurationsAction(
        slug,
        S,
        "special_cut",
        IDLE,
        form({ "d.M.short.cut_min": "60", "d.L.short.cut_min": "60" }),
      ),
    ).toMatchObject({ message: "Duraciones guardadas (2 combinaciones)" });
  });

  it("marca filas a medias y errores al guardar", async () => {
    withSupabase();
    expect(
      await actions.saveDurationsAction(slug, S, "bath", IDLE, form(cell("bath_min", "40"))),
    ).toMatchObject({
      status: "error",
      message: "Revisa las combinaciones marcadas.",
    });
    withSupabase({ rpcError: FAIL });
    expect(
      await actions.saveDurationsAction(
        slug,
        S,
        "other",
        IDLE,
        form({ "d.M.short.details_min": "15" }),
      ),
    ).toMatchObject({
      message: "No pudimos guardar las duraciones.",
    });
  });
});

describe("precios", () => {
  const tables = {
    service_durations: { data: [{ size: "M", coat: "short" }], error: null },
    extras: { data: [{ id: IDS.extra }], error: null },
  };

  it("guarda los precios del servicio y sus extras", async () => {
    const fake = withSupabase({ tables });
    expect(
      await actions.savePricesAction(
        slug,
        S,
        L,
        IDLE,
        form({ "p.s.M.short": "45.000", [`p.${IDS.extra}.M.short`]: "10000" }),
      ),
    ).toMatchObject({ status: "success", message: "Precios guardados" });
    expect(fake.client.rpc).toHaveBeenCalledWith("replace_location_prices", {
      p_location_id: L,
      p_service_id: S,
      p_service_rows: [{ size: "M", coat: "short", price_cop: 45000 }],
      p_extra_rows: [{ size: "M", coat: "short", price_cop: 10000, extra_id: IDS.extra }],
    });
  });

  it("un extra sin precio del servicio no se puede ofrecer; errores al guardar", async () => {
    withSupabase({ tables });
    expect(
      await actions.savePricesAction(
        slug,
        S,
        L,
        IDLE,
        form({ [`p.${IDS.extra}.M.short`]: "10000" }),
      ),
    ).toMatchObject({
      status: "error",
      fieldErrors: {
        [`p.${IDS.extra}.M.short`]:
          "Sin precio del servicio en este local, el extra no se puede ofrecer",
      },
    });
    expect(
      await actions.savePricesAction(slug, S, L, IDLE, form({ "p.s.M.short": "abc" })),
    ).toMatchObject({
      message: "Revisa los precios marcados.",
    });
    withSupabase({
      tables: {
        service_durations: { data: null, error: null },
        extras: { data: null, error: null },
      },
      rpcError: FAIL,
    });
    expect(await actions.savePricesAction(slug, S, L, IDLE, form({}))).toMatchObject({
      message: "No pudimos guardar los precios.",
    });
  });

  it("copia los precios a los otros locales", async () => {
    withSupabase({ rpcs: { copy_service_prices: { data: 2, error: null } } });
    expect(await actions.copyServicePricesAction(slug, S, L, IDLE)).toEqual({
      status: "success",
      message: "Precios copiados a 2 locales",
    });
    withSupabase({ rpcs: { copy_service_prices: { data: 1, error: null } } });
    expect(await actions.copyServicePricesAction(slug, S, L, IDLE)).toMatchObject({
      message: "Precios copiados a 1 local",
    });
    withSupabase({ rpcError: FAIL });
    expect(await actions.copyServicePricesAction(slug, S, L, IDLE)).toEqual({
      status: "error",
      message: "No pudimos copiar los precios.",
    });
  });
});
