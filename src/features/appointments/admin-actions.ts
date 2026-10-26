"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/components/forms/form-state";
import { tenantStaffContext } from "@/lib/auth/tenant-context";
import { zonedInputToUtc } from "@/lib/timezone";

import { canChangeStatus, statusLabel, type AppointmentStatus } from "./status";

const PATH = "/admin/agenda";
const CHECK_VIOLATION = "23514";

export async function changeStatusAction(
  slug: string,
  appointmentId: string,
  from: AppointmentStatus,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, PATH);
  const to = String(formData.get("to") ?? "") as AppointmentStatus;
  if (!canChangeStatus(from, to)) return { status: "error", message: "Ese cambio no es posible." };

  const { error } = await supabase
    .from("appointments")
    .update({ status: to })
    .match({ id: appointmentId, tenant_id: tenant.id, status: from });
  if (error) return { status: "error", message: "No pudimos cambiar el estado." };
  refresh();
  return { status: "success", message: `Estado: ${statusLabel[to]}` };
}

const readySchema = z.object({
  ready: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:MM"),
});

/** El spa ajusta la entrega aproximada (D29), el mismo día de la cita. */
export async function adjustReadyAction(
  slug: string,
  appointmentId: string,
  date: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { tenant, supabase } = await tenantStaffContext(slug, PATH);
  const parsed = readySchema.safeParse({ ready: formData.get("ready") });
  if (!parsed.success)
    return { status: "error", fieldErrors: { ready: parsed.error.issues[0].message } };

  const { error } = await supabase
    .from("appointments")
    .update({
      estimated_ready_at: zonedInputToUtc(`${date}T${parsed.data.ready}`, tenant.timezone),
    })
    .match({ id: appointmentId, tenant_id: tenant.id });
  if (error?.code === CHECK_VIOLATION)
    return { status: "error", fieldErrors: { ready: "Debe ser después de la llegada" } };
  if (error) return { status: "error", message: "No pudimos ajustar la entrega." };
  refresh();
  return { status: "success", message: `Entrega ajustada a ${parsed.data.ready}` };
}
