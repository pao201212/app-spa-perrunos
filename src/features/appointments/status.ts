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

export type StatusAction = { to: AppointmentStatus; label: string; danger?: boolean };

/** Siguientes pasos que el spa puede dar (igual que private.appointment_status_allowed). */
export const statusActions: Record<AppointmentStatus, StatusAction[]> = {
  pending: [
    { to: "scheduled", label: "Confirmar" },
    { to: "cancelled", label: "Cancelar", danger: true },
  ],
  scheduled: [
    { to: "received", label: "Recibir" },
    { to: "no_show", label: "No asistió", danger: true },
    { to: "cancelled", label: "Cancelar", danger: true },
  ],
  received: [
    { to: "in_progress", label: "Empezar" },
    { to: "cancelled", label: "Cancelar", danger: true },
  ],
  in_progress: [{ to: "ready", label: "Marcar lista" }],
  ready: [{ to: "delivered", label: "Entregar" }],
  delivered: [],
  cancelled: [],
  no_show: [],
};

export const canChangeStatus = (from: AppointmentStatus, to: AppointmentStatus) =>
  statusActions[from].some((action) => action.to === to);
