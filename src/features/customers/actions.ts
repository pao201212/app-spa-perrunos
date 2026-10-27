"use server";

import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { requireCustomer } from "@/lib/auth/customer";
import { requireViewer } from "@/lib/auth/guards";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/tenancy/get-tenant";

import { parsePetInput, storePetPhoto } from "./pet-input";
import { profileSchema } from "./schema";

const PETS_PATH = "/mascotas";

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
  const input = await parsePetInput(supabase, tenant.id, formData);
  if (!input.ok) return input.state;

  const saved = petId
    ? await supabase
        .from("pets")
        .update(input.row)
        .match({ id: petId, customer_id: customer.id })
        .select("id, photo_path")
        .single()
    : await supabase
        .from("pets")
        .insert({ ...input.row, tenant_id: tenant.id, customer_id: customer.id })
        .select("id, photo_path")
        .single();
  if (saved.error) {
    return {
      status: "error",
      message: "No pudimos guardar tu mascota. Intenta de nuevo.",
      values: input.values,
    };
  }

  if (
    input.photo &&
    !(await storePetPhoto(supabase, tenant.id, saved.data.id, input.photo, saved.data.photo_path))
  ) {
    return {
      status: "error",
      message: "Guardamos tu mascota, pero no la foto.",
      values: input.values,
    };
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
