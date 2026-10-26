import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ReasonCode } from "./reasons";

export type CapacityPet = {
  species: string;
  size: string;
  coat: string;
  services: string[];
  extras?: string[];
};

/** Cada hora candidata del día con su motivo (null = disponible). Solo staff. */
export async function explainSlots(locationId: string, date: string, pets: CapacityPet[]) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("explain_slots", {
    p_location_id: locationId,
    p_date: date,
    p_pets: pets,
  });
  if (error) throw error;
  return data.map((row) => ({ ...row, code: row.code as ReasonCode | null }));
}
