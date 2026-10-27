import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import type { Database } from "@/lib/db/types";

import { petFormSchema, petPhotoError } from "./schema";

export const PHOTO_BUCKET = "tenant-files";
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const FIELDS = ["name", "species", "breed_id", "weight_kg", "coat", "gender"] as const;

type Client = SupabaseClient<Database>;

export type PetInput =
  | { ok: true; row: ReturnType<typeof toRow>; photo: File | null; values: Record<string, string> }
  | { ok: false; state: FormState };

function toRow(data: ReturnType<typeof petFormSchema.parse>, isMixed: boolean) {
  // Raza definida: el pelo lo pone la raza (trigger), así que no se envía.
  return { ...data, coat: isMixed ? (data.coat ?? undefined) : undefined };
}

/** Valida el formulario de mascota contra la raza del spa (criollo exige peso y pelo, D9) y la foto. */
export async function parsePetInput(
  supabase: Client,
  tenantId: string,
  formData: FormData,
): Promise<PetInput> {
  const values = formValues(formData, FIELDS);
  const parsed = petFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      state: { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values },
    };
  }

  const { data: breed } = await supabase
    .from("tenant_breeds")
    .select("species, is_mixed")
    .match({ id: parsed.data.breed_id, tenant_id: tenantId })
    .maybeSingle();
  if (!breed || breed.species !== parsed.data.species) {
    return {
      ok: false,
      state: { status: "error", fieldErrors: { breed_id: "Elige una raza de la lista" }, values },
    };
  }
  if (breed.is_mixed && parsed.data.weight_kg === null) {
    return {
      ok: false,
      state: {
        status: "error",
        fieldErrors: { weight_kg: "Indica el peso: con él calculamos la talla" },
        values,
      },
    };
  }
  if (breed.is_mixed && parsed.data.coat === null) {
    return {
      ok: false,
      state: { status: "error", fieldErrors: { coat: "Elige el tipo de pelo" }, values },
    };
  }

  const photo = formData.get("photo");
  const file = photo instanceof File && photo.size > 0 ? photo : null;
  const photoProblem = file ? petPhotoError(file) : null;
  if (photoProblem)
    return { ok: false, state: { status: "error", fieldErrors: { photo: photoProblem }, values } };

  return { ok: true, row: toRow(parsed.data, breed.is_mixed), photo: file, values };
}

/** Sube la foto al bucket privado y reemplaza la anterior. Devuelve false si falla. */
export async function storePetPhoto(
  supabase: Client,
  tenantId: string,
  petId: string,
  photo: File,
  previousPath: string | null,
): Promise<boolean> {
  const path = `${tenantId}/pets/${petId}/${randomUUID()}.${EXTENSION[photo.type]}`;
  const upload = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, photo, { contentType: photo.type });
  if (upload.error) return false;
  await supabase.from("pets").update({ photo_path: path }).eq("id", petId);
  if (previousPath) await supabase.storage.from(PHOTO_BUCKET).remove([previousPath]);
  return true;
}
