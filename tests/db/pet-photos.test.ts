import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUsers,
  uniqueSuffix,
  type TestUser,
} from "./helpers";

// Fotos de mascotas: bucket PRIVADO (el legado tenía uno público, SPEC §1).
const BUCKET = "tenant-files";
const admin = adminClient();
const suffix = uniqueSuffix();
const png = new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" });

let tenantA: string;
let staffA: TestUser;
let owner: TestUser;
let stranger: TestUser;
let petPath: string;

beforeAll(async () => {
  const { data: tenant } = await admin
    .from("tenants")
    .insert({ slug: `fot-${suffix}`, name: "Fotos", is_active: true })
    .select("id")
    .single();
  tenantA = tenant!.id;
  [staffA, owner, stranger] = await Promise.all([
    createTestUser("staff-fotos"),
    createTestUser("dueno-fotos"),
    createTestUser("extrano-fotos"),
  ]);
  await admin.from("memberships").insert({ tenant_id: tenantA, user_id: staffA.id, role: "admin" });
  const { data: customerId } = await owner.client.rpc("ensure_customer_profile", {
    p_tenant_id: tenantA,
    p_full_name: "Dueño",
    p_whatsapp: "+57 300 444 4444",
  });
  await stranger.client.rpc("ensure_customer_profile", {
    p_tenant_id: tenantA,
    p_full_name: "Extraño",
    p_whatsapp: "+57 300 555 5555",
  });
  const { data: breed } = await admin
    .from("tenant_breeds")
    .select("id")
    .match({ tenant_id: tenantA, name: "Pug" })
    .single();
  const { data: pet } = await owner.client
    .from("pets")
    .insert({
      tenant_id: tenantA,
      customer_id: customerId as string,
      name: "Foto",
      species: "dog",
      breed_id: breed!.id,
    })
    .select("id")
    .single();
  petPath = `${tenantA}/pets/${pet!.id}/perfil.png`;
});

afterAll(async () => {
  await admin.storage.from(BUCKET).remove([petPath]);
  await admin.from("tenants").delete().eq("id", tenantA);
  await deleteTestUsers([staffA, owner, stranger].filter(Boolean));
});

describe("fotos de mascotas", () => {
  it("el bucket es privado", async () => {
    const { data } = await admin.storage.getBucket(BUCKET);
    expect(data?.public).toBe(false);
  });

  it("el dueño sube la foto de su mascota", async () => {
    const { error } = await owner.client.storage
      .from(BUCKET)
      .upload(petPath, png, { contentType: "image/png" });
    expect(error).toBeNull();
  });

  it("el dueño y el staff del spa pueden verla con URL firmada", async () => {
    for (const user of [owner, staffA]) {
      const { data, error } = await user.client.storage.from(BUCKET).createSignedUrl(petPath, 60);
      expect(error).toBeNull();
      expect(data?.signedUrl).toContain("token=");
    }
  });

  it("otro cliente y anon no pueden verla ni reemplazarla", async () => {
    const signed = await stranger.client.storage.from(BUCKET).createSignedUrl(petPath, 60);
    expect(signed.error).not.toBeNull();
    const overwrite = await stranger.client.storage
      .from(BUCKET)
      .upload(petPath, png, { upsert: true, contentType: "image/png" });
    expect(overwrite.error).not.toBeNull();
    const asAnon = await anonClient().storage.from(BUCKET).download(petPath);
    expect(asAnon.error).not.toBeNull();
  });

  it("nadie sube a la carpeta de una mascota ajena ni fuera de la estructura", async () => {
    const foreign = await stranger.client.storage
      .from(BUCKET)
      .upload(petPath.replace("perfil.png", "otra.png"), png, { contentType: "image/png" });
    expect(foreign.error).not.toBeNull();
    const loose = await owner.client.storage
      .from(BUCKET)
      .upload(`${tenantA}/suelto.png`, png, { contentType: "image/png" });
    expect(loose.error).not.toBeNull();
  });
});
