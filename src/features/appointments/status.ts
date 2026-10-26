import type { Database } from "@/lib/db/types";

export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

/** Flujo del SPEC §2: Agendada → Recibida → Atendiendo → Lista → Entregada (o Cancelada). */
export const statusLabel: Record<AppointmentStatus, string> = {
  pending: "Por confirmar",
  scheduled: "Agendada",
  received: "Recibida",
  in_progress: "Atendiendo",
  ready: "Lista para recoger",
  delivered: "Entregada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export const statusTone: Record<
  AppointmentStatus,
  "neutral" | "primary" | "success" | "warning" | "danger"
> = {
  pending: "warning",
  scheduled: "primary",
  received: "primary",
  in_progress: "primary",
  ready: "success",
  delivered: "neutral",
  cancelled: "danger",
  no_show: "danger",
};

export const ACTIVE_STATUSES = [
  "pending",
  "scheduled",
  "received",
  "in_progress",
  "ready",
] as const satisfies readonly AppointmentStatus[];

export const isActive = (status: AppointmentStatus) =>
  (ACTIVE_STATUSES as readonly AppointmentStatus[]).includes(status);

/** El cliente confirma la recepción cuando el spa ya recibió a la mascota (HU-B5). */
export const canConfirmReception = (status: AppointmentStatus, confirmedAt: string | null) =>
  !confirmedAt && ["received", "in_progress", "ready", "delivered"].includes(status);
