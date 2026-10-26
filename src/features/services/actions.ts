"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { tenantStaffContext } from "@/lib/auth/tenant-context";

import { parseDurationMatrix } from "./duration-matrix";
import { parsePriceMatrix, priceFieldName } from "./price-matrix";
import { categorySchema, extraSchema, serviceSchema, type ServiceKind } from "./schema";

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

export async function saveDurationsAction(
  slug: string,
  serviceId: string,
  kind: ServiceKind,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await tenantStaffContext(slug, detailPath(serviceId));
  // React reinicia el formulario tras el envío: se devuelve lo escrito para no perderlo.
  const values = Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => key.startsWith("d."))
      .map(([key, value]) => [key, String(value)]),
  );
  const { rows, errors } = parseDurationMatrix(kind, formData);
  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Revisa las combinaciones marcadas.",
      fieldErrors: errors,
      values,
    };
  }

  const { error } = await supabase.rpc("replace_service_durations", {
    p_service_id: serviceId,
    p_rows: rows,
  });
  if (error) return { status: "error", message: "No pudimos guardar las duraciones.", values };
  refresh();
  return {
    status: "success",
    message: `Duraciones guardadas (${rows.length} ${rows.length === 1 ? "combinación" : "combinaciones"})`,
    values,
  };
}

export async function savePricesAction(
  slug: string,
  serviceId: string,
  locationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, `${detailPath(serviceId)}/precios`);
  const values = Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => key.startsWith("p."))
      .map(([key, value]) => [key, String(value)]),
  );

  // Las combinaciones ofrecidas y los extras se leen del servidor, no del formulario.
  const [{ data: durations }, { data: extras }] = await Promise.all([
    supabase.from("service_durations").select("size, coat").eq("service_id", serviceId),
    supabase
      .from("extras")
      .select("id")
      .match({ service_id: serviceId, tenant_id: tenant.id, is_active: true }),
  ]);
  const offered = durations ?? [];

  const service = parsePriceMatrix("s", formData, offered);
  const extraResults = (extras ?? []).map((extra) => ({
    id: extra.id,
    ...parsePriceMatrix(extra.id, formData, offered),
  }));
  const errors = Object.assign({}, service.errors, ...extraResults.map((r) => r.errors));
  if (service.rows.length === 0) {
    for (const result of extraResults) {
      if (result.rows.length > 0) {
        errors[priceFieldName(result.id, result.rows[0].size, result.rows[0].coat)] =
          "Sin precio del servicio en este local, el extra no se puede ofrecer";
      }
    }
  }
  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Revisa los precios marcados.",
      fieldErrors: errors,
      values,
    };
  }

  const { error } = await supabase.rpc("replace_location_prices", {
    p_location_id: locationId,
    p_service_id: serviceId,
    p_service_rows: service.rows,
    p_extra_rows: extraResults.flatMap((result) =>
      result.rows.map((row) => ({ ...row, extra_id: result.id })),
    ),
  });
  if (error) return { status: "error", message: "No pudimos guardar los precios.", values };
  refresh();
  return { status: "success", message: "Precios guardados", values };
}

export async function copyServicePricesAction(
  slug: string,
  serviceId: string,
  locationId: string,
  _prev: FormState,
): Promise<FormState> {
  const { supabase } = await tenantStaffContext(slug, `${detailPath(serviceId)}/precios`);
  const { data, error } = await supabase.rpc("copy_service_prices", {
    p_service_id: serviceId,
    p_source_location_id: locationId,
  });
  if (error) return { status: "error", message: "No pudimos copiar los precios." };
  refresh();
  return {
    status: "success",
    message: `Precios copiados a ${data} ${data === 1 ? "local" : "locales"}`,
  };
}
