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
let superAdmin: TestUser;
let regular: TestUser;

beforeAll(async () => {
  [superAdmin, regular] = await Promise.all([
    createTestUser("super-razas"),
    createTestUser("normal-razas"),
  ]);
  const { error } = await admin.from("platform_admins").insert({ user_id: superAdmin.id });
  if (error) throw error;
});

afterAll(async () => {
  await admin.from("global_breeds").delete().like("name", `%${suffix}%`);
  await deleteTestUsers([superAdmin, regular].filter(Boolean));
});

describe("catálogo global de razas", () => {
  it("viene precargado con las razas del legado, visible sin sesión", async () => {
    const { count, error } = await anonClient()
      .from("global_breeds")
      .select("*", { count: "exact", head: true });
    expect(error).toBeNull();
    expect(count).toBeGreaterThanOrEqual(140);
  });

  it("trae las razas con su talla y pelo por defecto", async () => {
    const { data } = await anonClient()
      .from("global_breeds")
      .select("species, default_size, default_coat")
      .eq("name", "Golden Retriever")
      .single();
    expect(data).toEqual({ species: "dog", default_size: "L", default_coat: "long" });
  });

  it("tiene un criollo/mestizo por especie para el flujo de peso y pelo", async () => {
    const { data } = await anonClient()
      .from("global_breeds")
      .select("species")
      .eq("is_mixed", true);
    expect(data?.map((b) => b.species).sort()).toEqual(["cat", "dog"]);
  });

  it("no admite nombres repetidos dentro de la misma especie (sin distinguir mayúsculas)", async () => {
    const { error } = await admin.from("global_breeds").insert({
      species: "dog",
      name: "golden retriever",
      default_size: "L",
      default_coat: "long",
    });
    expect(error?.code).toBe("23505");
  });

  it("un usuario normal no puede modificar el catálogo", async () => {
    const { error } = await regular.client.from("global_breeds").insert({
      species: "dog",
      name: `Intrusa ${suffix}`,
      default_size: "M",
      default_coat: "short",
    });
    expect(error).not.toBeNull();

    const { data } = await regular.client
      .from("global_breeds")
      .update({ default_size: "XS" })
      .eq("name", "Golden Retriever")
      .select();
    expect(data ?? []).toEqual([]);
  });

  it("el super admin crea, edita y borra razas", async () => {
    const name = `Raza Prueba ${suffix}`;
    const created = await superAdmin.client
      .from("global_breeds")
      .insert({ species: "cat", name, default_size: "M", default_coat: "medium" })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const updated = await superAdmin.client
      .from("global_breeds")
      .update({ default_size: "L" })
      .eq("id", created.data!.id)
      .select("default_size")
      .single();
    expect(updated.data).toEqual({ default_size: "L" });

    const removed = await superAdmin.client
      .from("global_breeds")
      .delete()
      .eq("id", created.data!.id)
      .select("id");
    expect(removed.data).toHaveLength(1);
  });
});
