import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Citas del cliente con local, mascotas y servicios (lo congelado al reservar). */
export async function listOwnAppointments(customerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `id, code, status, starts_at, estimated_ready_at, total_cop, client_confirmed_at,
       locations (name, whatsapp),
       appointment_pets (pet_id, pets (name), appointment_items (item_type, name))`,
    )
    .eq("customer_id", customerId)
    .order("starts_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export type OwnAppointment = Awaited<ReturnType<typeof listOwnAppointments>>[number];
