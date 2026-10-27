"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { tenantStaffContext } from "@/lib/auth/tenant-context";

import { adminCustomerSchema, petOverrideSchema } from "./admin-schema";
import { parsePetInput, storePetPhoto } from "./pet-input";

const LIST_PATH = "/admin/clientes";
const detailPath = (customerId: string) => `${LIST_PATH}/${customerId}`;
const UNIQUE_VIOLATION = "23505";
const FIELDS = ["full_name", "whatsapp", "email"] as const;

function duplicateMessage(details: string | undefined): FormState["fieldErrors"] {
  return details?.includes("email")
    ? { email: "Ya hay un cliente con ese correo" }
    : { whatsapp: "Ya hay un cliente con ese WhatsApp" };
}

export async function createCustomerAction(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, `${LIST_PATH}/nuevo`);
  const values = formValues(formData, FIELDS);
  const parsed = adminCustomerSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...parsed.data, tenant_id: tenant.id })
    .select("id")
    .single();
  if (error?.code === UNIQUE_VIOLATION) {
    return {
      status: "error",
      fieldErrors: duplicateMessage(error.message + error.details),
      values,
    };
  }
  if (error) return { status: "error", message: "No pudimos inscribir al cliente.", values };
  redirect(detailPath(data.id));
}

export async function updateCustomerAction(
  slug: string,
  customerId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(customerId));
  const values = formValues(formData, FIELDS);
  const parsed = adminCustomerSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .match({ id: customerId, tenant_id: tenant.id });
  if (error?.code === UNIQUE_VIOLATION) {
    return {
      status: "error",
      fieldErrors: duplicateMessage(error.message + error.details),
      values,
    };
  }
  if (error) return { status: "error", message: "No pudimos guardar los datos.", values };
  refresh();
  return { status: "success", message: "Datos guardados" };
}

/** Mascota de un cliente, registrada por el staff (puede fijar talla y pelo a mano). */
export async function saveCustomerPetAction(
  slug: string,
  customerId: string,
  petId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(customerId));
  const input = await parsePetInput(supabase, tenant.id, formData);
  if (!input.ok) return input.state;

  const override = petOverrideSchema.parse({
    size_locked: formData.get("size_locked") ?? undefined,
    size: formData.get("locked_size") ?? undefined,
    coat: formData.get("locked_coat") ?? undefined,
  });
  const row = override.size_locked
    ? { ...input.row, size_locked: true, size: override.size, coat: override.coat }
    : { ...input.row, size_locked: false };

  const saved = petId
    ? await supabase
        .from("pets")
        .update(row)
        .match({ id: petId, customer_id: customerId, tenant_id: tenant.id })
        .select("id, photo_path")
        .single()
    : await supabase
        .from("pets")
        .insert({ ...row, tenant_id: tenant.id, customer_id: customerId })
        .select("id, photo_path")
        .single();
  if (saved.error)
    return { status: "error", message: "No pudimos guardar la mascota.", values: input.values };

  if (
    input.photo &&
    !(await storePetPhoto(supabase, tenant.id, saved.data.id, input.photo, saved.data.photo_path))
  ) {
    return {
      status: "error",
      message: "Guardamos la mascota, pero no la foto.",
      values: input.values,
    };
  }
  redirect(detailPath(customerId));
}

export async function archiveCustomerPetAction(
  slug: string,
  customerId: string,
  petId: string,
): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(customerId));
  await supabase
    .from("pets")
    .update({ is_active: false })
    .match({ id: petId, customer_id: customerId, tenant_id: tenant.id });
  redirect(detailPath(customerId));
}

export async function createPetGroupAction(
  slug: string,
  customerId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await tenantStaffContext(slug, detailPath(customerId));
  const petIds = [...new Set(formData.getAll("pet_ids").map(String))];
  // React reinicia el formulario tras cada envío: se devuelve la selección para conservarla.
  const values = { pet_ids: petIds.join(",") };
  if (petIds.length < 2) return { status: "error", message: "Elige al menos dos mascotas", values };

  const { error } = await supabase.rpc("create_pet_group", {
    p_customer_id: customerId,
    p_pet_ids: petIds,
  });
  if (error?.code === UNIQUE_VIOLATION) {
    return { status: "error", message: "Alguna de esas mascotas ya está en otro grupo", values };
  }
  if (error) return { status: "error", message: "No pudimos crear el grupo.", values };
  refresh();
  return { status: "success", message: "Grupo creado" };
}

export async function deletePetGroupAction(
  slug: string,
  customerId: string,
  groupId: string,
): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(customerId));
  await supabase
    .from("pet_groups")
    .delete()
    .match({ id: groupId, customer_id: customerId, tenant_id: tenant.id });
  refresh();
}
