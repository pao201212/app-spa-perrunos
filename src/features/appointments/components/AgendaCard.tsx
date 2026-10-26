"use client";

import { useActionState, useState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import { FormStatus } from "@/components/forms/FormStatus";
import { Badge, Button, Card, Input } from "@/components/ui";
import { formatCop } from "@/lib/money";

import { adjustReadyAction, changeStatusAction } from "../admin-actions";
import type { AgendaAppointment } from "../queries";
import { statusActions, statusLabel, statusTone } from "../status";
import styles from "./agenda.module.css";

type Props = {
  slug: string;
  appointment: AgendaAppointment;
  date: string;
  /** Horas ya formateadas en la zona del spa. */
  starts: string;
  ready: string;
};

export function AgendaCard({ slug, appointment: a, date, starts, ready }: Props) {
  const [statusState, statusAction, changing] = useActionState(
    changeStatusAction.bind(null, slug, a.id, a.status),
    initialFormState,
  );
  const [readyState, readyAction, adjusting] = useActionState(
    adjustReadyAction.bind(null, slug, a.id, date),
    initialFormState,
  );
  const [editingReady, setEditingReady] = useState(false);
  const pets = a.appointment_pets.map((p) => `${p.pets.name} (${p.size})`).join(", ");
  const services = [
    ...new Set(
      a.appointment_pets.flatMap((p) =>
        p.appointment_items.filter((i) => i.item_type !== "option").map((i) => i.name),
      ),
    ),
  ].join(", ");
  const finished = statusActions[a.status].length === 0;
  const readyId = `ready-${a.id}`;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.time}>
          {starts} → {ready}
        </span>
        <span className={styles.badges}>
          <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
          {a.overbooked && <Badge tone="warning">Sobrecupo</Badge>}
        </span>
      </div>
      <strong>{pets}</strong>
      <span className={styles.muted}>{services}</span>
      <span className={styles.muted}>
        {a.customers.full_name}
        {a.customers.whatsapp && ` · ${a.customers.whatsapp}`} · {a.code} · {formatCop(a.total_cop)}
      </span>
      {a.notes && <span className={styles.notes}>“{a.notes}”</span>}
      {a.client_confirmed_at && (
        <span className={styles.muted}>El cliente confirmó la recepción</span>
      )}

      {!finished && (
        <form action={statusAction} className={styles.actions}>
          {statusActions[a.status].map((action) => (
            <Button
              key={action.to}
              type="submit"
              name="to"
              value={action.to}
              variant={action.danger ? "ghost" : "primary"}
              disabled={changing}
            >
              {action.label}
              <span className="visually-hidden"> la cita de las {starts}</span>
            </Button>
          ))}
        </form>
      )}
      <FormStatus state={statusState} />

      {!finished && (
        <>
          <Button
            variant="ghost"
            aria-expanded={editingReady}
            aria-controls={readyId}
            onClick={() => setEditingReady((open) => !open)}
          >
            Ajustar entrega<span className="visually-hidden"> de la cita de las {starts}</span>
          </Button>
          <div id={readyId} hidden={!editingReady}>
            {editingReady && (
              <form action={readyAction} className={styles.readyForm}>
                <Input
                  label="Nueva hora de entrega"
                  name="ready"
                  type="time"
                  defaultValue={ready}
                  error={readyState.fieldErrors?.ready}
                />
                <Button type="submit" loading={adjusting}>
                  Guardar entrega
                </Button>
              </form>
            )}
          </div>
          <FormStatus state={readyState} />
        </>
      )}
    </Card>
  );
}
