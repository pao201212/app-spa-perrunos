"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fieldErrorsFrom, formValues, type FormState } from "@/components/forms/form-state";
import { tenantStaffContext } from "@/lib/auth/tenant-context";
import { zonedInputToUtc } from "@/lib/timezone";

import { absenceSchema, shiftSchema, staffSchema } from "./schema";

const LIST_PATH = "/admin/personal";
const detailPath = (staffId: string) => `${LIST_PATH}/${staffId}`;
const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01";
const DUPLICATE_NAME = { name: "Ya hay una persona con ese nombre" };

function staffValues(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    skills: formData.getAll("skills").map(String),
    is_active: formData.get("is_active") ?? undefined,
  };
}

export async function createStaffAction(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, `${LIST_PATH}/nuevo`);
  const raw = staffValues(formData);
  const parsed = staffSchema.safeParse({ ...raw, is_active: "on" });
  const values = { name: raw.name };
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { data, error } = await supabase
    .from("staff")
    .insert({ tenant_id: tenant.id, name: parsed.data.name })
    .select("id")
    .single();
  if (error?.code === UNIQUE_VIOLATION)
    return { status: "error", fieldErrors: DUPLICATE_NAME, values };
  if (error) return { status: "error", message: "No pudimos crear a la persona.", values };

  const skills = await supabase
    .from("staff_skills")
    .insert(
      parsed.data.skills.map((skill) => ({ tenant_id: tenant.id, staff_id: data.id, skill })),
    );
  if (skills.error)
    return { status: "error", message: "La persona se creó, pero no sus habilidades.", values };

  redirect(detailPath(data.id));
}

export async function updateStaffAction(
  slug: string,
  staffId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(staffId));
  const raw = staffValues(formData);
  const parsed = staffSchema.safeParse(raw);
  const values = { name: raw.name };
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("staff")
    .update({ name: parsed.data.name, is_active: parsed.data.is_active })
    .match({ id: staffId, tenant_id: tenant.id });
  if (error?.code === UNIQUE_VIOLATION)
    return { status: "error", fieldErrors: DUPLICATE_NAME, values };
  if (error) return { status: "error", message: "No pudimos guardar los datos.", values };

  const removed = await supabase
    .from("staff_skills")
    .delete()
    .match({ staff_id: staffId, tenant_id: tenant.id });
  const added = await supabase
    .from("staff_skills")
    .insert(
      parsed.data.skills.map((skill) => ({ tenant_id: tenant.id, staff_id: staffId, skill })),
    );
  if (removed.error || added.error)
    return { status: "error", message: "No pudimos guardar las habilidades.", values };

  refresh();
  return { status: "success", message: "Datos guardados" };
}

export async function addShiftAction(
  slug: string,
  staffId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(staffId));
  const values = formValues(formData, ["location_id", "weekday", "starts_at", "ends_at"]);
  const parsed = shiftSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase
    .from("staff_shifts")
    .insert({ ...parsed.data, tenant_id: tenant.id, staff_id: staffId });
  if (error?.code === EXCLUSION_VIOLATION) {
    return { status: "error", message: "Ese turno se cruza con otro de la misma persona.", values };
  }
  if (error) return { status: "error", message: "No pudimos agregar el turno.", values };
  refresh();
  return {
    status: "success",
    message: "Turno agregado",
    values: { location_id: values.location_id, weekday: values.weekday },
  };
}

export async function removeShiftAction(
  slug: string,
  staffId: string,
  shiftId: string,
): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(staffId));
  await supabase.from("staff_shifts").delete().match({ id: shiftId, tenant_id: tenant.id });
  refresh();
}

export async function addAbsenceAction(
  slug: string,
  staffId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(staffId));
  const values = formValues(formData, ["starts_at", "ends_at", "reason"]);
  const parsed = absenceSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { error } = await supabase.from("staff_absences").insert({
    tenant_id: tenant.id,
    staff_id: staffId,
    starts_at: zonedInputToUtc(parsed.data.starts_at, tenant.timezone),
    ends_at: zonedInputToUtc(parsed.data.ends_at, tenant.timezone),
    reason: parsed.data.reason,
  });
  if (error) return { status: "error", message: "No pudimos agregar la ausencia.", values };
  refresh();
  return { status: "success", message: "Ausencia agregada" };
}

export async function removeAbsenceAction(
  slug: string,
  staffId: string,
  absenceId: string,
): Promise<void> {
  const { tenant, supabase } = await tenantStaffContext(slug, detailPath(staffId));
  await supabase.from("staff_absences").delete().match({ id: absenceId, tenant_id: tenant.id });
  refresh();
}
