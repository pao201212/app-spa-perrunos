"use server";

import { refresh } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { requireCustomer } from "@/lib/auth/customer";

export async function confirmReceptionAction(
  slug: string,
  appointmentId: string,
  _prev: FormState,
): Promise<FormState> {
  const { supabase } = await requireCustomer(slug, "/citas");
  const { error } = await supabase.rpc("confirm_reception", { p_appointment_id: appointmentId });
  if (error) return { status: "error", message: error.message };
  refresh();
  return { status: "success", message: "¡Gracias! Confirmaste la recepción." };
}
