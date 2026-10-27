import { describe, expect, it } from "vitest";

import { dataset, IDS } from "../../../tests/fixtures/dataset";
import {
  CUSTOMER,
  FAIL,
  form,
  IDLE,
  redirectOf,
  server,
  UNIQUE,
  withSupabase,
} from "../../../tests/server-env";

import * as customer from "./actions";
import * as admin from "./admin-actions";

const slug = "spa";
const C = IDS.customer;
const pug = form({
  name: "Rocky",
  species: "dog",
  breed_id: IDS.breed,
  weight_kg: "8",
  gender: "male",
});
const photo = () => new File([new Uint8Array(10)], "rocky.webp", { type: "image/webp" });
const mixed = { data: { species: "dog", is_mixed: true }, error: null };
const saved = { data: { id: IDS.pet, photo_path: "old.webp" }, error: null };

describe("perfil del cliente", () => {
  const profile = form({ full_name: "Ana Pérez", whatsapp: "+57 300 123 4567" });

  it("guarda el perfil y vuelve a donde iba", async () => {
    server.viewer = CUSTOMER;
    withSupabase({ rpcs: { ensure_customer_profile: { data: C, error: null } } });
    expect(await customer.saveProfileAction(slug, null, IDLE, profile)).toEqual({
      status: "success",
      message: "Perfil guardado",
    });
    expect(
      await redirectOf(() => customer.saveProfileAction(slug, "/reservar", IDLE, profile)),
    ).toBe("/reservar");
  });

  it("valida y traduce los errores", async () => {
    server.viewer = CUSTOMER;
    expect(
      await customer.saveProfileAction(slug, null, IDLE, form({ full_name: "A" })),
    ).toMatchObject({
      status: "error",
    });
    withSupabase({
      rpcs: {
        ensure_customer_profile: {
          data: null,
          error: { code: "23505", message: "Ese WhatsApp ya está registrado" },
        },
      },
    });
    expect(await customer.saveProfileAction(slug, null, IDLE, profile)).toMatchObject({
      fieldErrors: { whatsapp: "Ese WhatsApp ya está registrado" },
    });
    withSupabase({ rpcError: FAIL });
    expect(await customer.saveProfileAction(slug, null, IDLE, profile)).toMatchObject({
      message: "No pudimos guardar tu perfil. Intenta de nuevo.",
    });
    for (const [error, expected] of [
      [UNIQUE, { fieldErrors: { whatsapp: "Ese WhatsApp ya está registrado en el spa" } }],
      [FAIL, { message: "No pudimos guardar tu perfil." }],
    ] as const) {
      withSupabase({
        rpcs: { ensure_customer_profile: { data: C, error: null } },
        writeError: error,
      });
      expect(await customer.saveProfileAction(slug, null, IDLE, profile)).toMatchObject(expected);
    }
  });
});

describe("mascotas del cliente", () => {
  it("crea o edita la mascota (con foto) y vuelve a la lista", async () => {
    const fake = withSupabase({ dataset: dataset(), tables: { pets: saved } });
    expect(await redirectOf(() => customer.savePetAction(slug, null, IDLE, pug))).toBe("/mascotas");
    const withPhoto = form({ name: "Rocky", species: "dog", breed_id: IDS.breed, weight_kg: "" });
    withPhoto.set("photo", photo());
    expect(await redirectOf(() => customer.savePetAction(slug, IDS.pet, IDLE, withPhoto))).toBe(
      "/mascotas",
    );
    expect(fake.storageBucket.upload).toHaveBeenCalled();
    expect(fake.storageBucket.remove).toHaveBeenCalledWith(["old.webp"]);
  });

  it("valida raza, peso, pelo y foto del criollo", async () => {
    withSupabase({ dataset: dataset() });
    expect(await customer.savePetAction(slug, null, IDLE, form({ name: "" }))).toMatchObject({
      status: "error",
    });
    expect(
      await customer.savePetAction(
        slug,
        null,
        IDLE,
        form({ name: "Misu", species: "cat", breed_id: IDS.breed }),
      ),
    ).toMatchObject({ fieldErrors: { breed_id: "Elige una raza de la lista" } });
    withSupabase({ dataset: dataset(), tables: { tenant_breeds: mixed } });
    const criollo = { name: "Toby", species: "dog", breed_id: IDS.mixedBreed };
    expect(await customer.savePetAction(slug, null, IDLE, form(criollo))).toMatchObject({
      fieldErrors: { weight_kg: "Indica el peso: con él calculamos la talla" },
    });
    expect(
      await customer.savePetAction(slug, null, IDLE, form({ ...criollo, weight_kg: "9" })),
    ).toMatchObject({
      fieldErrors: { coat: "Elige el tipo de pelo" },
    });
    const bad = form({ ...criollo, weight_kg: "9", coat: "long" });
    bad.set("photo", new File(["x"], "a.gif", { type: "image/gif" }));
    expect(await customer.savePetAction(slug, null, IDLE, bad)).toMatchObject({
      fieldErrors: { photo: expect.any(String) },
    });
  });

  it("avisa si no pudo guardar la mascota o la foto", async () => {
    withSupabase({ dataset: dataset(), tables: { pets: { data: null, error: FAIL } } });
    expect(await customer.savePetAction(slug, null, IDLE, pug)).toMatchObject({
      message: "No pudimos guardar tu mascota. Intenta de nuevo.",
    });
    const fake = withSupabase({ dataset: dataset(), tables: { pets: saved } });
    fake.storageBucket.upload.mockResolvedValueOnce({ data: null, error: FAIL } as never);
    const withPhoto = form({ name: "Rocky", species: "dog", breed_id: IDS.breed });
    withPhoto.set("photo", photo());
    expect(await customer.savePetAction(slug, IDS.pet, IDLE, withPhoto)).toMatchObject({
      message: "Guardamos tu mascota, pero no la foto.",
    });
  });

  it("archiva una mascota", async () => {
    const fake = withSupabase({ dataset: dataset() });
    expect(await redirectOf(() => customer.archivePetAction(slug, IDS.pet))).toBe("/mascotas");
    expect(fake.calls).toContainEqual({
      table: "pets",
      method: "update",
      args: [{ is_active: false }],
    });
  });
});

describe("clientes desde el panel", () => {
  const data = form({
    full_name: "Lucía Gómez",
    whatsapp: "+57 300 123 4567",
    email: "lucia@spa.test",
  });

  it("inscribe y actualiza clientes", async () => {
    withSupabase({ tables: { customers: { data: { id: C }, error: null } } });
    expect(await redirectOf(() => admin.createCustomerAction(slug, IDLE, data))).toBe(
      `/admin/clientes/${C}`,
    );
    withSupabase();
    expect(await admin.updateCustomerAction(slug, C, IDLE, data)).toEqual({
      status: "success",
      message: "Datos guardados",
    });
  });

  it("valida y distingue correo o WhatsApp repetido", async () => {
    expect(await admin.createCustomerAction(slug, IDLE, form({ full_name: "" }))).toMatchObject({
      status: "error",
    });
    expect(await admin.updateCustomerAction(slug, C, IDLE, form({ full_name: "" }))).toMatchObject({
      status: "error",
    });
    for (const run of [
      () => admin.createCustomerAction(slug, IDLE, data),
      () => admin.updateCustomerAction(slug, C, IDLE, data),
    ]) {
      withSupabase({
        writeError: { code: "23505", message: "customers_tenant_email_key", details: "" } as never,
      });
      expect(await run()).toMatchObject({
        fieldErrors: { email: "Ya hay un cliente con ese correo" },
      });
      withSupabase({ writeError: { code: "23505", message: "", details: "whatsapp" } as never });
      expect(await run()).toMatchObject({
        fieldErrors: { whatsapp: "Ya hay un cliente con ese WhatsApp" },
      });
    }
    withSupabase({ writeError: FAIL });
    expect(await admin.createCustomerAction(slug, IDLE, data)).toMatchObject({
      message: "No pudimos inscribir al cliente.",
    });
    expect(await admin.updateCustomerAction(slug, C, IDLE, data)).toMatchObject({
      message: "No pudimos guardar los datos.",
    });
  });

  it("registra mascotas del cliente, con talla fijada a mano", async () => {
    const fake = withSupabase({ dataset: dataset(), tables: { pets: saved } });
    const locked = form({
      name: "Rocky",
      species: "dog",
      breed_id: IDS.breed,
      size_locked: "on",
      locked_size: "L",
      locked_coat: "long",
    });
    expect(await redirectOf(() => admin.saveCustomerPetAction(slug, C, null, IDLE, locked))).toBe(
      `/admin/clientes/${C}`,
    );
    expect(fake.calls).toContainEqual({
      table: "pets",
      method: "insert",
      args: [expect.objectContaining({ size_locked: true, size: "L", coat: "long" })],
    });
    expect(await redirectOf(() => admin.saveCustomerPetAction(slug, C, IDS.pet, IDLE, pug))).toBe(
      `/admin/clientes/${C}`,
    );
    expect(await admin.saveCustomerPetAction(slug, C, null, IDLE, form({}))).toMatchObject({
      status: "error",
    });
  });

  it("avisa si no pudo guardar la mascota o su foto; archiva", async () => {
    withSupabase({ dataset: dataset(), tables: { pets: { data: null, error: FAIL } } });
    expect(await admin.saveCustomerPetAction(slug, C, null, IDLE, pug)).toMatchObject({
      message: "No pudimos guardar la mascota.",
    });
    const fake = withSupabase({ dataset: dataset(), tables: { pets: saved } });
    fake.storageBucket.upload.mockResolvedValueOnce({ data: null, error: FAIL } as never);
    const withPhoto = form({ name: "Rocky", species: "dog", breed_id: IDS.breed });
    withPhoto.set("photo", photo());
    expect(await admin.saveCustomerPetAction(slug, C, IDS.pet, IDLE, withPhoto)).toMatchObject({
      message: "Guardamos la mascota, pero no la foto.",
    });
    expect(await redirectOf(() => admin.archiveCustomerPetAction(slug, C, IDS.pet))).toBe(
      `/admin/clientes/${C}`,
    );
  });

  it("crea y borra grupos de mascotas", async () => {
    const fake = withSupabase();
    expect(
      await admin.createPetGroupAction(slug, C, IDLE, form({ pet_ids: [IDS.pet, IDS.pet2] })),
    ).toEqual({
      status: "success",
      message: "Grupo creado",
    });
    expect(
      await admin.createPetGroupAction(slug, C, IDLE, form({ pet_ids: [IDS.pet, IDS.pet] })),
    ).toMatchObject({
      message: "Elige al menos dos mascotas",
    });
    await admin.deletePetGroupAction(slug, C, IDS.group);
    expect(fake.calls).toContainEqual(
      expect.objectContaining({ table: "pet_groups", method: "delete" }),
    );
    withSupabase({ rpcError: UNIQUE });
    expect(
      await admin.createPetGroupAction(slug, C, IDLE, form({ pet_ids: [IDS.pet, IDS.pet2] })),
    ).toMatchObject({
      message: "Alguna de esas mascotas ya está en otro grupo",
    });
    withSupabase({ rpcError: FAIL });
    expect(
      await admin.createPetGroupAction(slug, C, IDLE, form({ pet_ids: [IDS.pet, IDS.pet2] })),
    ).toMatchObject({
      message: "No pudimos crear el grupo.",
    });
  });
});
