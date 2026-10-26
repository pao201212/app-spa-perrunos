import "server-only";

import type { PetSize } from "@/lib/pets/labels";
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

export type Fraction = { num: number; den: number };
export type OccupancyDay = {
  day: string;
  closed: boolean;
  jornadas: Fraction | null;
  used: Fraction;
  percent: number | null;
  by_size: { size: PetSize; pets: number }[];
};

/** Ocupación de cada día del rango (Usado / Jornadas y mascotas por talla). Solo staff. */
export async function getOccupancy(locationId: string, from: string, to: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("location_occupancy", {
    p_location_id: locationId,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return data as OccupancyDay[];
}
