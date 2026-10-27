"use server";

import { requireCustomer } from "@/lib/auth/customer";
import { timeInZone } from "@/lib/timezone";

import {
  bookingErrorMessage,
  bookRequestSchema,
  isSlotTaken,
  slotsRequestSchema,
  type BookRequest,
  type SlotsRequest,
} from "./schema";
import { toBookingPets } from "./pricing";

const PATH = "/reservar";

export type Slot = {
  startsAt: string;
  time: string;
  ready: string;
  /** Solo para el admin: la hora no está disponible y se puede tomar con sobrecupo. */
  overbook?: { label: string; message: string };
};
export type SlotsResult = { ok: true; slots: Slot[] } | { ok: false; message: string };

/** Horas disponibles del día con su entrega aproximada (capacity, D29). */
export async function loadSlotsAction(slug: string, request: SlotsRequest): Promise<SlotsResult> {
  const { tenant, customer, supabase } = await requireCustomer(slug, PATH);
  const parsed = slotsRequestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, message: "Revisa lo que elegiste." };

  // Especie, talla y pelo salen de la mascota guardada, no del navegador.
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id, species, size, coat")
    .eq("customer_id", customer.id)
    .in(
      "id",
      parsed.data.selections.map((s) => s.petId),
    );
  if (petsError || pets.length !== parsed.data.selections.length)
    return { ok: false, message: "Revisa las mascotas elegidas." };

  const { data, error } = await supabase.rpc("available_slots", {
    p_location_id: parsed.data.locationId,
    p_date: parsed.data.date,
    p_pets: toBookingPets(parsed.data.selections).map(({ pet_id, services, extras }) => {
      const pet = pets.find((p) => p.id === pet_id)!;
      return { species: pet.species, size: pet.size, coat: pet.coat, services, extras };
    }),
  });
  if (error) return { ok: false, message: "No pudimos cargar las horas. Intenta de nuevo." };
  return {
    ok: true,
    slots: data.map((slot) => ({
      startsAt: slot.starts_at,
      time: timeInZone(slot.starts_at, tenant.timezone),
      ready: timeInZone(slot.estimated_ready_at, tenant.timezone),
    })),
  };
}

export type BookResult =
  | {
      ok: true;
      booking: { code: string; pending: boolean; ready: string; total: number };
    }
  | { ok: false; message: string; slotTaken: boolean };

export async function bookAction(
  slug: string,
  request: BookRequest,
  // El cliente nunca reserva con sobrecupo; el parámetro existe para compartir el asistente.
  _overbook = false,
): Promise<BookResult> {
  const { tenant, supabase } = await requireCustomer(slug, PATH);
  const parsed = bookRequestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, message: "Revisa lo que elegiste.", slotTaken: false };

  const { data, error } = await supabase.rpc("book_appointment", {
    p_location_id: parsed.data.locationId,
    p_starts_at: parsed.data.startsAt,
    p_pets: toBookingPets(parsed.data.selections),
    p_notes: parsed.data.notes || undefined,
  });
  const booking = data?.[0];
  if (error || !booking) {
    const hint = error?.hint ?? undefined;
    return {
      ok: false,
      message: bookingErrorMessage(hint, error?.message ?? ""),
      slotTaken: isSlotTaken(hint),
    };
  }
  return {
    ok: true,
    booking: {
      code: booking.code,
      pending: booking.status === "pending",
      ready: timeInZone(booking.estimated_ready_at, tenant.timezone),
      total: booking.total_cop,
    },
  };
}
