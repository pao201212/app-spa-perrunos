import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, Button, buttonClassName, Card, Input, Select } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { AgendaCard } from "@/features/appointments/components/AgendaCard";
import styles from "@/features/appointments/components/agenda.module.css";
import { listAgenda, type AgendaAppointment } from "@/features/appointments/queries";
import { statusLabel, statusTone } from "@/features/appointments/status";
import { addDays, parseDay, shortDay, weekOf } from "@/features/appointments/week";
import { listLocations } from "@/features/locations/queries";
import { requireTenantStaff } from "@/lib/auth/guards";
import { longDate } from "@/lib/dates";
import { timeInZone, todayInZone, zonedInputToUtc } from "@/lib/timezone";

export const metadata: Metadata = { title: "Agenda" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function AgendaPage({ params, searchParams }: PageProps<"/s/[slug]/admin/agenda">) {
  return (
    <Suspense fallback={null}>
      {Promise.all([params, searchParams]).then(([{ slug }, query]) => (
        <AgendaContent slug={slug} location={first(query.local)} day={first(query.fecha)} />
      ))}
    </Suspense>
  );
}

async function AgendaContent({
  slug,
  location: locationParam,
  day: dayParam,
}: {
  slug: string;
  location?: string;
  day?: string;
}) {
  const { tenant } = await requireTenantStaff(slug, "/admin/agenda");
  const locations = (await listLocations(tenant.id)).filter((l) => l.is_active);
  const location = locations.find((l) => l.id === locationParam) ?? locations[0];
  const today = todayInZone(tenant.timezone);
  const day = parseDay(dayParam, today);

  return (
    <AdminShell businessName={tenant.name}>
      <div className={styles.header}>
        <h1>Agenda</h1>
        <Link href="/admin/citas/nueva" className={buttonClassName()}>
          Nueva cita
        </Link>
      </div>
      {!location ? (
        <Card>
          <p>
            Aún no hay locales activos. <Link href="/admin/locales/nuevo">Crea un local</Link>.
          </p>
        </Card>
      ) : (
        <>
          <form className={styles.toolbar}>
            <Select label="Local" name="local" defaultValue={location.id}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Input label="Día" name="fecha" type="date" defaultValue={day} />
            <Button type="submit" variant="ghost">
              Ver
            </Button>
          </form>
          <Week
            slug={slug}
            locationId={location.id}
            day={day}
            today={today}
            timeZone={tenant.timezone}
          />
        </>
      )}
    </AdminShell>
  );
}

async function Week({
  slug,
  locationId,
  day,
  today,
  timeZone,
}: {
  slug: string;
  locationId: string;
  day: string;
  today: string;
  timeZone: string;
}) {
  const days = weekOf(day);
  const appointments = await listAgenda(
    locationId,
    zonedInputToUtc(`${days[0]}T00:00`, timeZone),
    zonedInputToUtc(`${addDays(days[6], 1)}T00:00`, timeZone),
  );
  const byDay = new Map<string, AgendaAppointment[]>(days.map((d) => [d, []]));
  for (const a of appointments) byDay.get(todayInZone(timeZone, new Date(a.starts_at)))?.push(a);
  const href = (d: string) => `?local=${locationId}&fecha=${d}`;
  const selected = byDay.get(day) ?? [];

  return (
    <>
      <nav aria-label="Semanas" className={styles.weekNav}>
        <Link href={href(addDays(day, -7))}>← Semana anterior</Link>
        <Link href={href(today)}>Hoy</Link>
        <Link href={href(addDays(day, 7))}>Semana siguiente →</Link>
      </nav>

      <ol className={styles.weekGrid} aria-label="Semana">
        {days.map((d) => (
          <li key={d} className={cx(styles.weekDay, d === day && styles.selectedDay)}>
            <Link href={href(d)} aria-current={d === day ? "date" : undefined}>
              <strong>{shortDay(d)}</strong>
            </Link>
            <span className={styles.muted}>
              {byDay.get(d)!.length} {byDay.get(d)!.length === 1 ? "cita" : "citas"}
            </span>
            <ul className={styles.weekEntries}>
              {byDay.get(d)!.map((a) => (
                <li key={a.id} className={styles.weekEntry}>
                  {timeInZone(a.starts_at, timeZone)}{" "}
                  {a.appointment_pets.map((p) => p.pets.name).join(", ")}{" "}
                  <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <section aria-labelledby="dia" className={styles.day}>
        <nav aria-label="Días" className={styles.dayNav}>
          <Link href={href(addDays(day, -1))}>← {shortDay(addDays(day, -1))}</Link>
          <Link href={href(addDays(day, 1))}>{shortDay(addDays(day, 1))} →</Link>
        </nav>
        <h2 id="dia" className={styles.dayTitle}>
          {longDate(day)}
        </h2>
        {selected.length === 0 ? (
          <Card>
            <p>No hay citas este día.</p>
          </Card>
        ) : (
          <ul className={styles.list}>
            {selected.map((a) => (
              <li key={a.id}>
                <AgendaCard
                  slug={slug}
                  appointment={a}
                  date={day}
                  starts={timeInZone(a.starts_at, timeZone)}
                  ready={timeInZone(a.estimated_ready_at, timeZone)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
