import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CustomerShell } from "@/components/customer/CustomerShell";
import { Badge, buttonClassName, Card } from "@/components/ui";
import styles from "@/features/appointments/components/appointments.module.css";
import { ConfirmReceptionForm } from "@/features/appointments/components/ConfirmReceptionForm";
import { listOwnAppointments, type OwnAppointment } from "@/features/appointments/queries";
import {
  canConfirmReception,
  isActive,
  statusLabel,
  statusTone,
} from "@/features/appointments/status";
import { requireCustomer } from "@/lib/auth/customer";
import { formatCop } from "@/lib/money";
import { formatInZone, timeInZone } from "@/lib/timezone";

export const metadata: Metadata = { title: "Mis citas" };

export default function AppointmentsPage({ params }: PageProps<"/s/[slug]/citas">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <AppointmentsContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function AppointmentsContent({ slug }: { slug: string }) {
  const { tenant, customer } = await requireCustomer(slug, "/citas");
  const appointments = await listOwnAppointments(customer.id);
  const active = appointments
    .filter((a) => isActive(a.status))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const history = appointments.filter((a) => !isActive(a.status));

  return (
    <CustomerShell businessName={tenant.name}>
      <div className={styles.header}>
        <h1>Mis citas</h1>
        <Link href="/reservar" className={buttonClassName()}>
          Reservar
        </Link>
      </div>
      <section aria-labelledby="activas" className={styles.section}>
        <h2 id="activas">Próximas</h2>
        {active.length === 0 ? (
          <Card>
            <p>No tienes citas próximas.</p>
          </Card>
        ) : (
          <ul className={styles.list}>
            {active.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                slug={slug}
                appointment={appointment}
                timeZone={tenant.timezone}
              />
            ))}
          </ul>
        )}
      </section>
      {history.length > 0 && (
        <section aria-labelledby="historial" className={styles.section}>
          <h2 id="historial">Historial</h2>
          <ul className={styles.list}>
            {history.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                slug={slug}
                appointment={appointment}
                timeZone={tenant.timezone}
              />
            ))}
          </ul>
        </section>
      )}
    </CustomerShell>
  );
}

function AppointmentCard({
  slug,
  appointment: a,
  timeZone,
}: {
  slug: string;
  appointment: OwnAppointment;
  timeZone: string;
}) {
  const petNames = a.appointment_pets.map((p) => p.pets.name).join(" y ");
  const services = [
    ...new Set(
      a.appointment_pets.flatMap((p) =>
        p.appointment_items.filter((i) => i.item_type !== "option").map((i) => i.name),
      ),
    ),
  ].join(", ");

  return (
    <li>
      <Card className={styles.card}>
        <div className={styles.header}>
          <span className={styles.when}>{formatInZone(a.starts_at, timeZone)}</span>
          <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
        </div>
        <dl className={styles.details}>
          <div>
            <dt>Mascotas</dt>
            <dd>{petNames}</dd>
          </div>
          <div>
            <dt>Servicios</dt>
            <dd>{services}</dd>
          </div>
          <div>
            <dt>Local</dt>
            <dd>{a.locations.name}</dd>
          </div>
          <div>
            <dt>Entrega aprox.</dt>
            <dd>{timeInZone(a.estimated_ready_at, timeZone)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatCop(a.total_cop)}</dd>
          </div>
          <div>
            <dt>Código</dt>
            <dd>{a.code}</dd>
          </div>
        </dl>
        {a.status === "pending" && (
          <p className={styles.muted}>El spa confirmará tu cita pronto.</p>
        )}
        {canConfirmReception(a.status, a.client_confirmed_at) && (
          <ConfirmReceptionForm slug={slug} appointmentId={a.id} petNames={petNames} />
        )}
        {a.client_confirmed_at && <p className={styles.muted}>Confirmaste la recepción.</p>}
      </Card>
    </li>
  );
}
