"use server";

import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { breedFormSchema } from "./schema";

const UNIQUE_VIOLATION = "23505";
const FIELDS = ["species", "name", "default_size", "default_coat", "is_mixed"] as const;
const LIST_PATH = "/razas";

/** Crea (breedId null) o actualiza una raza del catálogo global. */
export async function saveBreedAction(
  breedId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSuperAdmin(LIST_PATH);
  const values = formValues(formData, FIELDS);
  const parsed = breedFormSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const supabase = await createSupabaseServerClient();
  const { error } = breedId
    ? await supabase.from("global_breeds").update(parsed.data).eq("id", breedId)
    : await supabase.from("global_breeds").insert(parsed.data);

  if (error?.code === UNIQUE_VIOLATION) {
    const message = parsed.data.is_mixed
      ? "Ya existe un criollo para esa especie"
      : "Ya existe una raza con ese nombre para esa especie";
    return { status: "error", fieldErrors: { name: message }, values };
  }
  if (error)
    return { status: "error", message: "No pudimos guardar la raza. Intenta de nuevo.", values };

  redirect(LIST_PATH);
}

export async function deleteBreedAction(breedId: string): Promise<void> {
  await requireSuperAdmin(LIST_PATH);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("global_breeds").delete().eq("id", breedId);
  if (error) throw new Error("No pudimos eliminar la raza");
  redirect(LIST_PATH);
}
