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
let staffA: TestUser;
let staffB: TestUser;
const globalBreedName = `Raza Global ${suffix}`;

async function breedId(tenantId: string, name: string, species = "dog") {
  const { data, error } = await admin
    .from("tenant_breeds")
    .select("id")
    .match({ tenant_id: tenantId, name, species })
    .single();
  if (error) throw error;
  return data.id;
}

beforeAll(async () => {
  const { data, error } = await admin
    .from("tenants")
    .insert([
      { slug: `cat-a-${suffix}`, name: "Catálogo A", is_active: true },
      { slug: `cat-b-${suffix}`, name: "Catálogo B", is_active: true },
    ])
    .select("id, slug");
  if (error) throw error;
  tenantA = data.find((t) => t.slug.startsWith("cat-a"))!.id;
  tenantB = data.find((t) => t.slug.startsWith("cat-b"))!.id;
  [staffA, staffB] = await Promise.all([
    createTestUser("staff-cat-a"),
    createTestUser("staff-cat-b"),
  ]);
  await admin.from("memberships").insert([
    { tenant_id: tenantA, user_id: staffA.id, role: "admin" },
    { tenant_id: tenantB, user_id: staffB.id, role: "admin" },
  ]);
});

afterAll(async () => {
  await admin.from("tenants").delete().in("id", [tenantA, tenantB]);
  await admin.from("global_breeds").delete().eq("name", globalBreedName);
  await deleteTestUsers([staffA, staffB].filter(Boolean));
});

describe("al crear un spa", () => {
  it("hereda todo el catálogo global de razas", async () => {
    const [{ count: globalCount }, { count: tenantCount }] = await Promise.all([
      admin.from("global_breeds").select("*", { count: "exact", head: true }),
      admin
        .from("tenant_breeds")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantA),
    ]);
    expect(tenantCount).toBe(globalCount);
  });

  it("recibe los umbrales de talla por peso del legado", async () => {
    const { data } = await admin
      .from("size_thresholds")
      .select("species, size, max_kg")
      .eq("tenant_id", tenantA)
      .order("max_kg");
    const bySpecies = (species: string) =>
      data?.filter((t) => t.species === species).map((t) => [t.size, Number(t.max_kg)]);
    expect(bySpecies("dog")).toEqual([
      ["XS", 5],
      ["S", 10],
      ["M", 20],
      ["L", 30],
      ["XL", 40],
      ["XXL", 100],
    ]);
    expect(bySpecies("cat")).toEqual([
      ["XS", 2],
      ["S", 4],
      ["M", 6],
      ["L", 8],
      ["XL", 10],
    ]);
  });
});

describe("resolve_pet_size (D9: el peso manda; sin peso, la raza)", () => {
  it.each([
    ["Golden sin peso → talla de la raza", "Golden Retriever", "dog", null, "L"],
    ["Golden de 8 kg → por peso", "Golden Retriever", "dog", 8, "S"],
    ["borde exacto: 5 kg es XS", "Criollo / Mestizo", "dog", 5, "XS"],
    ["5,1 kg ya es S", "Criollo / Mestizo", "dog", 5.1, "S"],
    ["criollo de 25 kg", "Criollo / Mestizo", "dog", 25, "L"],
    ["por encima del último umbral → la talla más grande", "Criollo / Mestizo", "dog", 150, "XXL"],
    ["gata de 3 kg", "Criollo / Mestizo", "cat", 3, "S"],
    ["gato de 12 kg → la más grande definida para gatos", "Criollo / Mestizo", "cat", 12, "XL"],
  ])("%s", async (_, name, species, weight, expected) => {
    const { data, error } = await anonClient().rpc("resolve_pet_size", {
      p_breed_id: await breedId(tenantA, name, species),
      p_weight_kg: weight,
    });
    expect(error).toBeNull();
    expect(data).toBe(expected);
  });
});

describe("razas del spa", () => {
  it("el staff ajusta una raza heredada y queda marcada como personalizada", async () => {
    const id = await breedId(tenantA, "Golden Retriever");
    const { data, error } = await staffA.client
      .from("tenant_breeds")
      .update({ size: "XL" })
      .eq("id", id)
      .select("size, is_customized")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ size: "XL", is_customized: true });
  });

  it("un cambio en el catálogo global solo llega a los spas que no personalizaron la raza", async () => {
    const { data: golden } = await admin
      .from("global_breeds")
      .select("id")
      .eq("name", "Golden Retriever")
      .single();
    await admin.from("global_breeds").update({ default_coat: "medium" }).eq("id", golden!.id);
    try {
      const { data } = await admin
        .from("tenant_breeds")
        .select("tenant_id, coat, size")
        .eq("global_breed_id", golden!.id)
        .in("tenant_id", [tenantA, tenantB]);
      expect(data?.find((b) => b.tenant_id === tenantA)).toEqual({
        tenant_id: tenantA,
        coat: "long",
        size: "XL",
      });
      expect(data?.find((b) => b.tenant_id === tenantB)).toEqual({
        tenant_id: tenantB,
        coat: "medium",
        size: "L",
      });
    } finally {
      await admin.from("global_breeds").update({ default_coat: "long" }).eq("id", golden!.id);
    }
  });

  it("una raza global nueva aparece en todos los spas, y si se borra el spa la conserva como propia", async () => {
    const { data: created } = await admin
      .from("global_breeds")
      .insert({ species: "dog", name: globalBreedName, default_size: "M", default_coat: "short" })
      .select("id")
      .single();
    const { count } = await admin
      .from("tenant_breeds")
      .select("*", { count: "exact", head: true })
      .eq("global_breed_id", created!.id)
      .in("tenant_id", [tenantA, tenantB]);
    expect(count).toBe(2);

    await admin.from("global_breeds").delete().eq("id", created!.id);
    const { data: kept } = await admin
      .from("tenant_breeds")
      .select("global_breed_id")
      .match({ tenant_id: tenantA, name: globalBreedName });
    expect(kept).toEqual([{ global_breed_id: null }]);
  });

  it("el staff crea razas propias, sin repetir nombre en la especie", async () => {
    const own = await staffA.client
      .from("tenant_breeds")
      .insert({
        tenant_id: tenantA,
        species: "dog",
        name: "Abbey Refugio",
        size: "M",
        coat: "short",
      })
      .select("global_breed_id, is_customized")
      .single();
    expect(own.error).toBeNull();
    expect(own.data).toEqual({ global_breed_id: null, is_customized: true });

    const duplicate = await staffA.client.from("tenant_breeds").insert({
      tenant_id: tenantA,
      species: "dog",
      name: "abbey refugio",
      size: "M",
      coat: "short",
    });
    expect(duplicate.error?.code).toBe("23505");
  });

  it("anon ve las razas activas del spa, no las ocultas", async () => {
    const id = await breedId(tenantA, "Pug");
    await staffA.client.from("tenant_breeds").update({ is_active: false }).eq("id", id);
    const { data } = await anonClient().from("tenant_breeds").select("name").eq("id", id);
    expect(data).toEqual([]);
  });

  it("el staff de B no puede tocar las razas de A", async () => {
    const id = await breedId(tenantA, "Beagle");
    const { data } = await staffB.client
      .from("tenant_breeds")
      .update({ size: "XXL" })
      .eq("id", id)
      .select();
    expect(data ?? []).toEqual([]);
  });
});

describe("size_thresholds", () => {
  it("el staff ajusta los umbrales de su spa", async () => {
    const { error } = await staffA.client
      .from("size_thresholds")
      .update({ max_kg: 6 })
      .match({ tenant_id: tenantA, species: "dog", size: "XS" });
    expect(error).toBeNull();
  });

  it("los umbrales deben crecer con la talla", async () => {
    const { error } = await staffA.client
      .from("size_thresholds")
      .update({ max_kg: 3 })
      .match({ tenant_id: tenantA, species: "dog", size: "S" });
    expect(error?.message).toMatch(/crecientes/i);
  });

  it("el staff de B no puede cambiar los umbrales de A", async () => {
    const { data } = await staffB.client
      .from("size_thresholds")
      .update({ max_kg: 1 })
      .match({ tenant_id: tenantA, species: "cat", size: "XS" })
      .select();
    expect(data ?? []).toEqual([]);
  });
});
