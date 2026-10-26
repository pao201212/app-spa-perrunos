"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { tenantStaffContext } from "@/lib/auth/tenant-context";

import { categorySchema, extraSchema, serviceSchema } from "./schema";

const LIST_PATH = "/admin/servicios";
const detailPath = (serviceId: string) => `${LIST_PATH}/${serviceId}`;
const UNIQUE_VIOLATION = "23505";
const SERVICE_FIELDS = [
  "name",
  "kind",
  "species",
  "category_id",
  "description",
  "is_active",
] as const;

export async function createCategoryAction(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, LIST_PATH);
  const values = formValues(formData, ["name"]);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("service_categories")
    .insert({ ...parsed.data, tenant_id: tenant.id });
  if (error?.code === UNIQUE_VIOLATION)
    return { status: "error", fieldErrors: { name: "Esa categoría ya existe" }, values };
  if (error) return { status: "error", message: "No pudimos crear la categoría.", values };
  refresh();
  return { status: "success", message: "Categoría agregada" };
}

export async function deleteCategoryAction(slug: string, categoryId: string): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, LIST_PATH);
  // Los servicios de la categoría quedan sin categoría (FK on delete set null).
  await supabase
    .from("service_categories")
    .delete()
    .match({ id: categoryId, tenant_id: tenant.id });
  refresh();
}

export async function saveServiceAction(
  slug: string,
  serviceId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(
    slug,
    serviceId ? detailPath(serviceId) : `${LIST_PATH}/nuevo`,
  );
  const values = formValues(formData, SERVICE_FIELDS);
  const parsed = serviceSchema.safeParse(serviceId ? values : { ...values, is_active: "on" });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  if (serviceId) {
    // El tipo no cambia una vez creado: sus duraciones dependen de él.
    const { name, species, category_id, description, is_active } = parsed.data;
    const changes = { name, species, category_id, description, is_active };
    const { error } = await supabase
      .from("services")
      .update(changes)
      .match({ id: serviceId, tenant_id: tenant.id });
    if (error?.code === UNIQUE_VIOLATION)
      return {
        status: "error",
        fieldErrors: { name: "Ya hay un servicio con ese nombre" },
        values,
      };
    if (error) return { status: "error", message: "No pudimos guardar el servicio.", values };
    refresh();
    return { status: "success", message: "Servicio guardado" };
  }

  const { data, error } = await supabase
    .from("services")
    .insert({ ...parsed.data, tenant_id: tenant.id })
    .select("id")
    .single();
  if (error?.code === UNIQUE_VIOLATION)
    return { status: "error", fieldErrors: { name: "Ya hay un servicio con ese nombre" }, values };
  if (error) return { status: "error", message: "No pudimos crear el servicio.", values };
  redirect(detailPath(data.id));
}

export async function addExtraAction(
  slug: string,
  serviceId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(serviceId));
  const values = formValues(formData, ["name", "extra_minutes"]);
  const parsed = extraSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("extras")
    .insert({ ...parsed.data, tenant_id: tenant.id, service_id: serviceId });
  if (error?.code === UNIQUE_VIOLATION)
    return { status: "error", fieldErrors: { name: "Ese extra ya existe" }, values };
  if (error) return { status: "error", message: "No pudimos agregar el extra.", values };
  refresh();
  return { status: "success", message: "Extra agregado" };
}

export async function toggleExtraAction(
  slug: string,
  serviceId: string,
  extraId: string,
  isActive: boolean,
): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(serviceId));
  await supabase
    .from("extras")
    .update({ is_active: isActive })
    .match({ id: extraId, tenant_id: tenant.id });
  refresh();
}
