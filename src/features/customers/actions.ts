"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { requireCustomer } from "@/lib/auth/customer";
import { requireViewer } from "@/lib/auth/guards";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/tenancy/get-tenant";

import { petFormSchema, petPhotoError, profileSchema } from "./schema";

const PETS_PATH = "/mascotas";
const PHOTO_BUCKET = "tenant-files";
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function saveProfileAction(
  slug: string,
  next: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireViewer("/perfil");
  const tenant = await getTenant(slug);
  const values = formValues(formData, ["full_name", "whatsapp"]);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const supabase = await createSupabaseServerClient();
  const { data: customerId, error } = await supabase.rpc("ensure_customer_profile", {
    p_tenant_id: tenant.id,
    p_full_name: parsed.data.full_name,
    p_whatsapp: parsed.data.whatsapp,
  });
  if (error?.code === "23505")
    return { status: "error", fieldErrors: { whatsapp: error.message }, values };
  if (error)
    return { status: "error", message: "No pudimos guardar tu perfil. Intenta de nuevo.", values };

  const update = await supabase.from("customers").update(parsed.data).eq("id", customerId);
  if (update.error?.code === "23505") {
    return {
      status: "error",
      fieldErrors: { whatsapp: "Ese WhatsApp ya está registrado en el spa" },
      values,
    };
  }
  if (update.error) return { status: "error", message: "No pudimos guardar tu perfil.", values };

  if (next) redirect(safeNextPath(next));
  return { status: "success", message: "Perfil guardado" };
}

export async function savePetAction(
  slug: string,
  petId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, customer, supabase } = await requireCustomer(slug, PETS_PATH);
  const values = formValues(formData, [
    "name",
    "species",
    "breed_id",
    "weight_kg",
    "coat",
    "gender",
  ]);
  const parsed = petFormSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { data: breed } = await supabase
    .from("tenant_breeds")
    .select("species, is_mixed")
    .match({ id: parsed.data.breed_id, tenant_id: tenant.id })
    .maybeSingle();
  if (!breed || breed.species !== parsed.data.species) {
    return { status: "error", fieldErrors: { breed_id: "Elige una raza de la lista" }, values };
  }
  // Criollo: el peso define la talla y el cliente elige el pelo (D9).
  if (breed.is_mixed && parsed.data.weight_kg === null) {
    return {
      status: "error",
      fieldErrors: { weight_kg: "Indica el peso: con él calculamos la talla" },
      values,
    };
  }
  if (breed.is_mixed && parsed.data.coat === null) {
    return { status: "error", fieldErrors: { coat: "Elige el tipo de pelo" }, values };
  }

  const photo = formData.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  const photoProblem = hasPhoto ? petPhotoError(photo) : null;
  if (photoProblem) return { status: "error", fieldErrors: { photo: photoProblem }, values };

  // Raza definida: el pelo lo pone la raza (trigger), así que no se envía.
  const row = {
    ...parsed.data,
    coat: breed.is_mixed ? (parsed.data.coat ?? undefined) : undefined,
  };
  const saved = petId
    ? await supabase
        .from("pets")
        .update(row)
        .match({ id: petId, customer_id: customer.id })
        .select("id, photo_path")
        .single()
    : await supabase
        .from("pets")
        .insert({ ...row, tenant_id: tenant.id, customer_id: customer.id })
        .select("id, photo_path")
        .single();
  if (saved.error)
    return { status: "error", message: "No pudimos guardar tu mascota. Intenta de nuevo.", values };

  if (hasPhoto) {
    const path = `${tenant.id}/pets/${saved.data.id}/${randomUUID()}.${EXTENSION[photo.type]}`;
    const upload = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, photo, { contentType: photo.type });
    if (upload.error)
      return { status: "error", message: "Guardamos tu mascota, pero no la foto.", values };
    await supabase.from("pets").update({ photo_path: path }).eq("id", saved.data.id);
    if (saved.data.photo_path)
      await supabase.storage.from(PHOTO_BUCKET).remove([saved.data.photo_path]);
  }

  redirect(PETS_PATH);
}

/** Quita la mascota de la lista. Se conserva el registro por el historial de citas. */
export async function archivePetAction(slug: string, petId: string): Promise<void> {
  const { customer, supabase } = await requireCustomer(slug, PETS_PATH);
  await supabase
    .from("pets")
    .update({ is_active: false })
    .match({ id: petId, customer_id: customer.id });
  redirect(PETS_PATH);
}
