"use server";

import { reasonLabel, reasonMessage } from "@/features/capacity/reasons";
import { tenantStaffContext } from "@/lib/auth/tenant-context";
import { timeInZone } from "@/lib/timezone";

import type { BookResult, Slot, SlotsResult } from "./actions";
import { toBookingPets } from "./pricing";
import {
  bookingErrorMessage,
  bookRequestSchema,
  isSlotTaken,
  slotsRequestSchema,
  type BookRequest,
  type SlotsRequest,
} from "./schema";

const PATH = "/admin/citas/nueva";

/**
 * Horas del día para una cita manual (HU-B2): las disponibles y las que se pueden tomar con
 * sobrecupo, con su motivo. Las que no admiten sobrecupo (sin precio, cerrado…) no se ofrecen.
 */
export async function adminLoadSlotsAction(
  slug: string,
  customerId: string,
  request: SlotsRequest,
): Promise<SlotsResult> {
  const { tenant, supabase } = await tenantStaffContext(slug, PATH);
  const parsed = slotsRequestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, message: "Revisa lo que elegiste." };

  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id, species, size, coat")
    .eq("customer_id", customerId)
    .in(
      "id",
      parsed.data.selections.map((s) => s.petId),
    );
  if (petsError || pets.length !== parsed.data.selections.length)
    return { ok: false, message: "Revisa las mascotas elegidas." };

  const { data, error } = await supabase.rpc("explain_slots", {
    p_location_id: parsed.data.locationId,
    p_date: parsed.data.date,
    p_pets: toBookingPets(parsed.data.selections).map(({ pet_id, services, extras }) => {
      const pet = pets.find((p) => p.id === pet_id)!;
      return { species: pet.species, size: pet.size, coat: pet.coat, services, extras };
    }),
  });
  if (error) return { ok: false, message: "No pudimos cargar las horas. Intenta de nuevo." };

  const slots: Slot[] = [];
  let blocked: string | null = null;
  for (const row of data) {
    const code = row.code as Parameters<typeof reasonMessage>[0] | null;
    const message = code ? reasonMessage(code, row.detail, tenant.timezone) : null;
    // Qué motivos admiten sobrecupo lo decide SQL (capacity.overridable).
    if (!row.starts_at || (code && !row.overridable)) {
      blocked ??= message;
      continue;
    }
    slots.push({
      startsAt: row.starts_at,
      time: timeInZone(row.starts_at, tenant.timezone),
      ready: timeInZone(row.estimated_ready_at!, tenant.timezone),
      overbook: code ? { label: reasonLabel[code], message: message! } : undefined,
    });
  }
  if (slots.length === 0 && blocked) return { ok: false, message: blocked };
  return { ok: true, slots };
}

export async function adminBookAction(
  slug: string,
  customerId: string,
  request: BookRequest,
  overbook = false,
): Promise<BookResult> {
  const { tenant, supabase } = await tenantStaffContext(slug, PATH);
  const parsed = bookRequestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, message: "Revisa lo que elegiste.", slotTaken: false };

  const { data, error } = await supabase.rpc("book_appointment", {
    p_location_id: parsed.data.locationId,
    p_starts_at: parsed.data.startsAt,
    p_pets: toBookingPets(parsed.data.selections),
    p_customer_id: customerId,
    p_overbook: overbook,
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
