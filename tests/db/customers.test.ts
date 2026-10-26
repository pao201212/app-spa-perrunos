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
let clientX: TestUser;
let clientY: TestUser;
let invited: TestUser;
let customerX: string;
let customerY: string;

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
      { slug: `cli-a-${suffix}`, name: "Clientes A", is_active: true },
      { slug: `cli-b-${suffix}`, name: "Clientes B", is_active: true },
    ])
    .select("id, slug");
  if (error) throw error;
  tenantA = data.find((t) => t.slug.startsWith("cli-a"))!.id;
  tenantB = data.find((t) => t.slug.startsWith("cli-b"))!.id;
  [staffA, clientX, clientY, invited] = await Promise.all([
    createTestUser("staff-cli"),
    createTestUser("cliente-x"),
    createTestUser("cliente-y"),
    createTestUser("invitado"),
  ]);
  await admin.from("memberships").insert({ tenant_id: tenantA, user_id: staffA.id, role: "admin" });
});

afterAll(async () => {
  await admin.from("tenants").delete().in("id", [tenantA, tenantB]);
  await deleteTestUsers([staffA, clientX, clientY, invited].filter(Boolean));
});

describe("ensure_customer_profile", () => {
  it("crea el perfil del cliente en el spa con el correo de su cuenta", async () => {
    const { data, error } = await clientX.client.rpc("ensure_customer_profile", {
      p_tenant_id: tenantA,
      p_full_name: "Cliente X",
      p_whatsapp: "+57 300 111 1111",
    });
    expect(error).toBeNull();
    customerX = data as string;
    const { data: row } = await admin
      .from("customers")
      .select("user_id, email, full_name")
      .eq("id", customerX)
      .single();
    expect(row).toEqual({ user_id: clientX.id, email: clientX.email, full_name: "Cliente X" });
  });

  it("es idempotente: llamarla de nuevo devuelve el mismo perfil", async () => {
    const { data } = await clientX.client.rpc("ensure_customer_profile", {
      p_tenant_id: tenantA,
      p_full_name: "Otro nombre",
      p_whatsapp: "+57 300 111 1111",
    });
    expect(data).toBe(customerX);
  });

  it("vincula el perfil que el admin inscribió con el mismo correo (D13)", async () => {
    const { data: preRegistered } = await staffA.client
      .from("customers")
      .insert({
        tenant_id: tenantA,
        full_name: "Inscrito por el admin",
        whatsapp: "+57 300 222 2222",
        email: invited.email.toUpperCase(),
      })
      .select("id")
      .single();
    const { data } = await invited.client.rpc("ensure_customer_profile", {
      p_tenant_id: tenantA,
      p_full_name: "Nombre de Google",
      p_whatsapp: "+57 399 999 9999",
    });
    expect(data).toBe(preRegistered!.id);
    const { data: row } = await admin
      .from("customers")
      .select("user_id, full_name, whatsapp")
      .eq("id", data as string)
      .single();
    // Se conserva lo que registró el admin.
    expect(row).toEqual({
      user_id: invited.id,
      full_name: "Inscrito por el admin",
      whatsapp: "+57 300 222 2222",
    });
  });

  it("el mismo usuario puede ser cliente de dos spas con perfiles separados (S6)", async () => {
    const { data } = await clientX.client.rpc("ensure_customer_profile", {
      p_tenant_id: tenantB,
      p_full_name: "Cliente X en B",
      p_whatsapp: "+57 300 111 1111",
    });
    expect(data).not.toBe(customerX);
  });

  it("anon no puede crear perfiles", async () => {
    const { error } = await anonClient().rpc("ensure_customer_profile", {
      p_tenant_id: tenantA,
      p_full_name: "Anónimo",
      p_whatsapp: "+57 300 000 0000",
    });
    expect(error).not.toBeNull();
  });
});

describe("claim_customer_profile (vinculación automática al entrar, D13)", () => {
  it("vincula el perfil inscrito por el admin con el correo de la cuenta, sin pedir datos", async () => {
    const newcomer = await createTestUser("recien-llegado");
    try {
      const { data: preRegistered } = await staffA.client
        .from("customers")
        .insert({ tenant_id: tenantA, full_name: "Inscrita en mostrador", email: newcomer.email })
        .select("id")
        .single();
      const { data, error } = await newcomer.client.rpc("claim_customer_profile", {
        p_tenant_id: tenantA,
      });
      expect(error).toBeNull();
      expect(data).toBe(preRegistered!.id);
      const { data: row } = await admin
        .from("customers")
        .select("user_id")
        .eq("id", preRegistered!.id)
        .single();
      expect(row).toEqual({ user_id: newcomer.id });
    } finally {
      await deleteTestUsers([newcomer]);
    }
  });

  it("es idempotente: llamadas repetidas o simultáneas devuelven el perfil ya vinculado", async () => {
    const twice = await createTestUser("doble-clic");
    try {
      const { data: preRegistered } = await staffA.client
        .from("customers")
        .insert({ tenant_id: tenantA, full_name: "Doble", email: twice.email })
        .select("id")
        .single();
      const results = await Promise.all([
        twice.client.rpc("claim_customer_profile", { p_tenant_id: tenantA }),
        twice.client.rpc("claim_customer_profile", { p_tenant_id: tenantA }),
      ]);
      expect(results.map((r) => r.data)).toEqual([preRegistered!.id, preRegistered!.id]);
      const again = await twice.client.rpc("claim_customer_profile", { p_tenant_id: tenantA });
      expect(again.data).toBe(preRegistered!.id);
    } finally {
      await deleteTestUsers([twice]);
    }
  });

  it("devuelve null si no hay un perfil que vincular (y no crea nada)", async () => {
    const stranger = await createTestUser("sin-perfil");
    try {
      const { data, error } = await stranger.client.rpc("claim_customer_profile", {
        p_tenant_id: tenantB,
      });
      expect(error).toBeNull();
      expect(data).toBeNull();
      const { count } = await admin
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", stranger.id);
      expect(count).toBe(0);
    } finally {
      await deleteTestUsers([stranger]);
    }
  });
});

describe("customers: privacidad", () => {
  beforeAll(async () => {
    const { data } = await clientY.client.rpc("ensure_customer_profile", {
      p_tenant_id: tenantA,
      p_full_name: "Cliente Y",
      p_whatsapp: "+57 300 333 3333",
    });
    customerY = data as string;
  });

  it("cada cliente ve solo su perfil; el staff ve todos los de su spa", async () => {
    const own = await clientX.client.from("customers").select("id").eq("tenant_id", tenantA);
    expect(own.data).toEqual([{ id: customerX }]);
    const asStaff = await staffA.client.from("customers").select("id").eq("tenant_id", tenantA);
    expect(asStaff.data?.map((c) => c.id)).toEqual(expect.arrayContaining([customerX, customerY]));
  });

  it("el cliente edita su nombre y WhatsApp, pero no su correo ni su usuario", async () => {
    const ok = await clientX.client
      .from("customers")
      .update({ full_name: "X editado" })
      .eq("id", customerX)
      .select("full_name");
    expect(ok.data).toEqual([{ full_name: "X editado" }]);

    await clientX.client
      .from("customers")
      .update({ email: "robado@x.co", user_id: clientY.id })
      .eq("id", customerX);
    const { data } = await admin
      .from("customers")
      .select("email, user_id")
      .eq("id", customerX)
      .single();
    expect(data).toEqual({ email: clientX.email, user_id: clientX.id });
  });

  it("no admite dos clientes con el mismo WhatsApp en un spa", async () => {
    const { error } = await admin
      .from("customers")
      .insert({ tenant_id: tenantA, full_name: "Dup", whatsapp: "+57 300 333 3333" });
    expect(error?.code).toBe("23505");
  });

  it("anon no ve clientes", async () => {
    const { data } = await anonClient().from("customers").select("id").eq("tenant_id", tenantA);
    expect(data ?? []).toEqual([]);
  });
});

describe("pets", () => {
  let golden: string;
  let criollo: string;
  let petX: string;

  beforeAll(async () => {
    golden = await breedId(tenantA, "Golden Retriever");
    criollo = await breedId(tenantA, "Criollo / Mestizo");
  });

  it("el cliente registra su mascota y la talla y el pelo salen de la raza", async () => {
    const { data, error } = await clientX.client
      .from("pets")
      .insert({
        tenant_id: tenantA,
        customer_id: customerX,
        name: "Max",
        species: "dog",
        breed_id: golden,
      })
      .select("id, size, coat")
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ size: "L", coat: "long" });
    petX = data!.id;
  });

  it("si indica el peso, la talla sale del peso (D9)", async () => {
    const { data } = await clientX.client
      .from("pets")
      .update({ weight_kg: 8 })
      .eq("id", petX)
      .select("size")
      .single();
    expect(data).toEqual({ size: "S" });
  });

  it("un criollo usa el pelo que elige el cliente y la talla por peso", async () => {
    const { data, error } = await clientX.client
      .from("pets")
      .insert({
        tenant_id: tenantA,
        customer_id: customerX,
        name: "Luna",
        species: "dog",
        breed_id: criollo,
        weight_kg: 25,
        coat: "medium",
        gender: "female",
      })
      .select("size, coat")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ size: "L", coat: "medium" });
  });

  it("el staff puede fijar talla y pelo; el cálculo automático ya no los cambia", async () => {
    await staffA.client
      .from("pets")
      .update({ size: "XL", coat: "short", size_locked: true })
      .eq("id", petX);
    const { data } = await clientX.client
      .from("pets")
      .update({ weight_kg: 3 })
      .eq("id", petX)
      .select("size, coat, size_locked")
      .single();
    expect(data).toEqual({ size: "XL", coat: "short", size_locked: true });
  });

  it("el cliente no puede fijar la talla ni desbloquearla", async () => {
    await clientX.client.from("pets").update({ size_locked: false, size: "XS" }).eq("id", petX);
    const { data } = await admin.from("pets").select("size, size_locked").eq("id", petX).single();
    expect(data).toEqual({ size: "XL", size_locked: true });
  });

  it("un cliente no ve ni toca las mascotas de otro", async () => {
    const seen = await clientY.client.from("pets").select("id").eq("id", petX);
    expect(seen.data ?? []).toEqual([]);
    const created = await clientY.client.from("pets").insert({
      tenant_id: tenantA,
      customer_id: customerX,
      name: "Intrusa",
      species: "dog",
      breed_id: golden,
    });
    expect(created.error).not.toBeNull();
  });

  it("la especie debe coincidir con la raza y la raza debe ser del mismo spa", async () => {
    const wrongSpecies = await admin.from("pets").insert({
      tenant_id: tenantA,
      customer_id: customerX,
      name: "Michi",
      species: "cat",
      breed_id: golden,
    });
    expect(wrongSpecies.error).not.toBeNull();
    const otherTenantBreed = await breedId(tenantB, "Golden Retriever");
    const crossTenant = await admin.from("pets").insert({
      tenant_id: tenantA,
      customer_id: customerX,
      name: "Cruzado",
      species: "dog",
      breed_id: otherTenantBreed,
    });
    expect(crossTenant.error?.code).toBe("23503");
  });
});

describe("pet_groups (se bañan juntas, D10/D23)", () => {
  it("el staff agrupa mascotas del mismo dueño; el dueño ve el grupo pero no lo crea", async () => {
    const { data: pets } = await admin.from("pets").select("id").eq("customer_id", customerX);
    const { data: group, error } = await staffA.client
      .from("pet_groups")
      .insert({ tenant_id: tenantA, customer_id: customerX })
      .select("id")
      .single();
    expect(error).toBeNull();
    const members = await staffA.client
      .from("pet_group_members")
      .insert(pets!.map((p) => ({ tenant_id: tenantA, group_id: group!.id, pet_id: p.id })));
    expect(members.error).toBeNull();

    const asOwner = await clientX.client
      .from("pet_group_members")
      .select("pet_id")
      .eq("group_id", group!.id);
    expect(asOwner.data?.length).toBe(2);
    const ownerCreates = await clientX.client
      .from("pet_groups")
      .insert({ tenant_id: tenantA, customer_id: customerX });
    expect(ownerCreates.error).not.toBeNull();
  });

  it("no admite mascotas de otro dueño en el grupo", async () => {
    const { data: petY } = await admin
      .from("pets")
      .insert({
        tenant_id: tenantA,
        customer_id: customerY,
        name: "Rocky",
        species: "dog",
        breed_id: await breedId(tenantA, "Pug"),
      })
      .select("id")
      .single();
    const { data: group } = await admin
      .from("pet_groups")
      .select("id")
      .eq("customer_id", customerX)
      .single();
    const { error } = await admin
      .from("pet_group_members")
      .insert({ tenant_id: tenantA, group_id: group!.id, pet_id: petY!.id });
    expect(error?.message).toMatch(/mismo dueño/i);
  });
});
