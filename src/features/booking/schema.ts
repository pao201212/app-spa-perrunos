import { z } from "zod";

const ids = z.array(z.uuid()).max(20);

export const selectionsSchema = z
  .array(
    z.object({
      petId: z.uuid(),
      serviceId: z.uuid(),
      cutId: z.uuid().nullable(),
      extras: ids,
      options: ids,
    }),
  )
  .min(1, "Elige al menos una mascota")
  .max(6, "Máximo 6 mascotas por reserva");

export const slotsRequestSchema = z.object({
  locationId: z.uuid(),
  date: z.iso.date(),
  selections: selectionsSchema,
});

export const bookRequestSchema = z.object({
  locationId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  selections: selectionsSchema,
  notes: z.string().trim().max(500).optional(),
});

export type SlotsRequest = z.infer<typeof slotsRequestSchema>;
export type BookRequest = z.infer<typeof bookRequestSchema>;

/** Mensaje para el cliente según el código de capacity.book (hint del error). */
export function bookingErrorMessage(hint: string | undefined, message: string): string {
  switch (hint) {
    case "CUPO_LLENO":
    case "SIN_ESPACIO":
      return "Ese horario acaba de ocuparse. Elige otra hora.";
    case "LIMITE_RESERVAS":
    case "MASCOTA_OCUPADA":
      return message;
    case "PASADO":
      return "Ese horario ya pasó. Elige otra hora.";
    default:
      return "No pudimos reservar ese horario. Elige otra hora o intenta de nuevo.";
  }
}

/** Códigos con los que conviene volver a elegir hora (y recargar las horas del día). */
export const isSlotTaken = (hint: string | undefined) =>
  hint === "CUPO_LLENO" || hint === "SIN_ESPACIO" || hint === "PASADO";
