"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { tenantStaffContext } from "@/lib/auth/tenant-context";

import { parseCapacityMatrix } from "./capacity-matrix";
import {
  applySectionsSchema,
  bookingSettingsSchema,
  closureSchema,
  hourRangeSchema,
  locationDetailsSchema,
  nextStationName,
  stationSchema,
  waitingZoneSchema,
} from "./schema";

const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01";
const LIST_PATH = "/admin/locales";
const detailPath = (locationId: string) => `${LIST_PATH}/${locationId}`;

const DETAIL_FIELDS = ["name", "address", "whatsapp", "is_active"] as const;
const DUPLICATE_NAME = { name: "Ya hay un local con ese nombre" };

export async function createLocationAction(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, `${LIST_PATH}/nuevo`);
  const values = formValues(formData, DETAIL_FIELDS);
  const parsed = locationDetailsSchema.safeParse({ ...values, is_active: "on" });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { data, error } = await supabase
    .from("locations")
    .insert({ ...parsed.data, tenant_id: tenant.id })
    .select("id")
    .single();
  if (error?.code === UNIQUE_VIOLATION)
    return { status: "error", fieldErrors: DUPLICATE_NAME, values };
  if (error)
    return { status: "error", message: "No pudimos crear el local. Intenta de nuevo.", values };

  redirect(detailPath(data.id));
}

export async function updateLocationDetailsAction(
  slug: string,
  locationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  const values = formValues(formData, DETAIL_FIELDS);
  const parsed = locationDetailsSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("locations")
    .update(parsed.data)
    .match({ id: locationId, tenant_id: tenant.id });
  if (error?.code === UNIQUE_VIOLATION)
    return { status: "error", fieldErrors: DUPLICATE_NAME, values };
  if (error) return { status: "error", message: "No pudimos guardar los datos.", values };
  refresh();
  return { status: "success", message: "Datos guardados" };
}

export async function updateBookingSettingsAction(
  slug: string,
  locationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  const values = formValues(formData, [
    "confirmation_mode",
    "cancel_window_hours",
    "max_days_ahead",
    "slot_step_min",
    "bather_continues_drying",
  ]);
  const parsed = bookingSettingsSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("locations")
    .update(parsed.data)
    .match({ id: locationId, tenant_id: tenant.id });
  if (error) return { status: "error", message: "No pudimos guardar los ajustes.", values };
  refresh();
  return { status: "success", message: "Ajustes guardados" };
}

const DUPLICATE_STATION = { name: "Ya hay una estación con ese nombre en este local" };

/** Crea (stationId null) o edita una estación; sin nombre, propone "Tina N" o "Mesa N". */
export async function saveStationAction(
  slug: string,
  locationId: string,
  stationId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  const values = formValues(formData, ["name", "kind", "for_special_cut"]);
  const parsed = stationSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  let { name } = parsed.data;
  if (!name) {
    const { data: others } = await supabase
      .from("stations")
      .select("id, name")
      .match({ location_id: locationId, tenant_id: tenant.id });
    const taken = (others ?? []).filter((s) => s.id !== stationId).map((s) => s.name);
    name = nextStationName(parsed.data.kind, taken);
  }
  const row = { ...parsed.data, name };

  if (stationId) {
    const { error } = await supabase
      .from("stations")
      .update(row)
      .match({ id: stationId, tenant_id: tenant.id });
    if (error?.code === UNIQUE_VIOLATION)
      return { status: "error", fieldErrors: DUPLICATE_STATION, values };
    if (error) return { status: "error", message: "No pudimos guardar la estación.", values };
    refresh();
    return { status: "success", message: "Estación guardada" };
  }

  const { count } = await supabase
    .from("stations")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId);
  const { error } = await supabase
    .from("stations")
    .insert({ ...row, tenant_id: tenant.id, location_id: locationId, sort_order: count ?? 0 });
  if (error?.code === UNIQUE_VIOLATION)
    return { status: "error", fieldErrors: DUPLICATE_STATION, values };
  if (error) return { status: "error", message: "No pudimos agregar la estación.", values };
  refresh();
  // Se conserva el tipo elegido para agregar varias seguidas.
  return {
    status: "success",
    message: `${name} agregada`,
    values: { kind: row.kind, for_special_cut: row.for_special_cut ? "on" : "" },
  };
}

export async function removeStationAction(
  slug: string,
  locationId: string,
  stationId: string,
): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  await supabase.from("stations").delete().match({ id: stationId, tenant_id: tenant.id });
  refresh();
}

export async function addHourRangeAction(
  slug: string,
  locationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  const values = formValues(formData, ["weekday", "opens_at", "closes_at"]);
  const parsed = hourRangeSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("location_hours")
    .insert({ ...parsed.data, tenant_id: tenant.id, location_id: locationId });
  if (error?.code === EXCLUSION_VIOLATION) {
    return { status: "error", message: "Ese tramo se cruza con otro del mismo día.", values };
  }
  if (error) return { status: "error", message: "No pudimos agregar el tramo.", values };
  refresh();
  return { status: "success", message: "Tramo agregado", values: { weekday: values.weekday } };
}

export async function removeHourRangeAction(
  slug: string,
  locationId: string,
  rangeId: string,
): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  await supabase.from("location_hours").delete().match({ id: rangeId, tenant_id: tenant.id });
  refresh();
}

export async function addClosureAction(
  slug: string,
  locationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  const values = formValues(formData, ["date", "reason"]);
  const parsed = closureSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("location_closures")
    .insert({ ...parsed.data, tenant_id: tenant.id, location_id: locationId });
  if (error?.code === UNIQUE_VIOLATION) {
    return {
      status: "error",
      fieldErrors: { date: "Ese día ya está marcado como cierre" },
      values,
    };
  }
  if (error) return { status: "error", message: "No pudimos agregar el cierre.", values };
  refresh();
  return { status: "success", message: "Cierre agregado" };
}

export async function removeClosureAction(
  slug: string,
  locationId: string,
  closureId: string,
): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  await supabase.from("location_closures").delete().match({ id: closureId, tenant_id: tenant.id });
  refresh();
}

export async function saveCapacityAction(
  slug: string,
  locationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await tenantStaffContext(slug, detailPath(locationId));
  // React reinicia el formulario tras el envío: se devuelve lo escrito para no perderlo.
  const values = Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => key.startsWith("c."))
      .map(([key, value]) => [key, String(value)]),
  );
  const { rows, errors } = parseCapacityMatrix(formData);
  if (Object.keys(errors).length > 0)
    return { status: "error", message: "Revisa las celdas marcadas.", fieldErrors: errors, values };

  const { error } = await supabase.rpc("replace_location_pet_capacity", {
    p_location_id: locationId,
    p_rows: rows,
  });
  if (error) return { status: "error", message: "No pudimos guardar la capacidad.", values };
  refresh();
  return {
    status: "success",
    message: `Capacidad guardada (${rows.length} ${rows.length === 1 ? "combinación" : "combinaciones"})`,
    values,
  };
}

export async function addWaitingZoneAction(
  slug: string,
  locationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  const values = formValues(formData, ["name", "seats"]);
  const parsed = waitingZoneSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("location_waiting_zones")
    .insert({ ...parsed.data, tenant_id: tenant.id, location_id: locationId });
  if (error?.code === UNIQUE_VIOLATION)
    return { status: "error", fieldErrors: { name: "Ya hay una zona con ese nombre" }, values };
  if (error) return { status: "error", message: "No pudimos agregar la zona.", values };
  refresh();
  return { status: "success", message: `${parsed.data.name} agregada` };
}

export async function removeWaitingZoneAction(
  slug: string,
  locationId: string,
  zoneId: string,
): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(locationId));
  await supabase
    .from("location_waiting_zones")
    .delete()
    .match({ id: zoneId, tenant_id: tenant.id });
  refresh();
}

export async function applyToAllLocationsAction(
  slug: string,
  locationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await tenantStaffContext(slug, detailPath(locationId));
  const parsed = applySectionsSchema.safeParse({ sections: formData.getAll("sections") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const { data, error } = await supabase.rpc("apply_location_settings", {
    p_source_location_id: locationId,
    p_sections: parsed.data.sections,
  });
  if (error)
    return { status: "error", message: "No pudimos aplicar la configuración. Intenta de nuevo." };
  refresh();
  return {
    status: "success",
    message: `Configuración aplicada a ${data} ${data === 1 ? "local" : "locales"}`,
  };
}
