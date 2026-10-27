import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const PHOTO_BUCKET = "tenant-files";
const SIGNED_URL_SECONDS = 60 * 60;
export const PET_COLUMNS =
  "id, name, species, gender, breed_id, weight_kg, size, coat, size_locked, photo_path, tenant_breeds (name, is_mixed)";

export async function listOwnPets(customerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pets")
    .select(PET_COLUMNS)
    .match({ customer_id: customerId, is_active: true })
    .order("created_at");
  if (error) throw error;
  return withPhotoUrls(data);
}

export async function getOwnPet(customerId: string, petId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pets")
    .select(PET_COLUMNS)
    .match({ customer_id: customerId, id: petId, is_active: true })
    .maybeSingle();
  if (error) throw error;
  return data ? (await withPhotoUrls([data]))[0] : null;
}

/** Razas visibles del spa para el formulario; el criollo primero en cada especie. */
export async function listBreedOptions(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenant_breeds")
    .select("id, name, species, is_mixed")
    .match({ tenant_id: tenantId, is_active: true })
    .order("is_mixed", { ascending: false })
    .order("name");
  if (error) throw error;
  return data;
}

/** Las fotos viven en un bucket privado: se muestran con URLs firmadas de corta duración. */
export async function withPhotoUrls<T extends { photo_path: string | null }>(pets: T[]) {
  const paths = pets.map((pet) => pet.photo_path).filter((path): path is string => !!path);
  if (paths.length === 0) return pets.map((pet) => ({ ...pet, photoUrl: null as string | null }));

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  const urls = new Map(data?.map((item) => [item.path, item.signedUrl]));
  return pets.map((pet) => ({
    ...pet,
    photoUrl: (pet.photo_path && urls.get(pet.photo_path)) || null,
  }));
}

export type OwnPet = Awaited<ReturnType<typeof listOwnPets>>[number];
export type BreedOption = Awaited<ReturnType<typeof listBreedOptions>>[number];
