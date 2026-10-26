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

/** Citas de un local entre dos instantes, con cliente, mascotas y servicios (agenda del spa). */
export async function listAgenda(locationId: string, fromIso: string, toIso: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `id, code, status, starts_at, estimated_ready_at, total_cop, overbooked, notes, source,
       client_confirmed_at,
       customers (id, full_name, whatsapp),
       appointment_pets (pet_id, size, coat, pets (name), appointment_items (item_type, name))`,
    )
    .eq("location_id", locationId)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at");
  if (error) throw error;
  return data;
}

export type AgendaAppointment = Awaited<ReturnType<typeof listAgenda>>[number];
