import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button, Card, Select } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import styles from "@/features/capacity/components/occupancy.module.css";
import {
  leadingBlanks,
  monthLabel,
  monthRange,
  parseMonth,
  shiftMonth,
} from "@/features/capacity/month";
import { getOccupancy, type OccupancyDay } from "@/features/capacity/queries";
import { formatFraction } from "@/features/capacity/reasons";
import { listLocations } from "@/features/locations/queries";
import { requireTenantStaff } from "@/lib/auth/guards";
import { todayInZone } from "@/lib/timezone";

export const metadata: Metadata = { title: "Ocupación" };

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function OccupancyPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]/admin/ocupacion">) {
  return (
    <Suspense fallback={null}>
      {Promise.all([params, searchParams]).then(([{ slug }, query]) => (
        <OccupancyContent slug={slug} location={first(query.local)} month={first(query.mes)} />
      ))}
    </Suspense>
  );
}

async function OccupancyContent({
  slug,
  location: locationParam,
  month: monthParam,
}: {
  slug: string;
  location?: string;
  month?: string;
}) {
  const { tenant } = await requireTenantStaff(slug, "/admin/ocupacion");
  const locations = (await listLocations(tenant.id)).filter((l) => l.is_active);
  const location = locations.find((l) => l.id === locationParam) ?? locations[0];
  const month = parseMonth(monthParam, todayInZone(tenant.timezone));

  return (
    <AdminShell businessName={tenant.name}>
      <h1>Ocupación</h1>
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
            <input type="hidden" name="mes" value={month} />
            <Button type="submit" variant="ghost">
              Ver
            </Button>
          </form>
          <nav aria-label="Meses" className={styles.monthNav}>
            <Link href={`?local=${location.id}&mes=${shiftMonth(month, -1)}`}>
              ← {monthLabel(shiftMonth(month, -1))}
            </Link>
            <h2 className={styles.monthName}>{monthLabel(month)}</h2>
            <Link href={`?local=${location.id}&mes=${shiftMonth(month, 1)}`}>
              {monthLabel(shiftMonth(month, 1))} →
            </Link>
          </nav>
          <Calendar locationId={location.id} month={month} />
        </>
      )}
    </AdminShell>
  );
}

async function Calendar({ locationId, month }: { locationId: string; month: string }) {
  const days = await getOccupancy(locationId, ...monthRange(month));
  return (
    <ol className={styles.calendar} aria-label={`Ocupación de ${monthLabel(month)}`}>
      {WEEKDAYS.map((weekday) => (
        <li key={weekday} className={styles.weekday} aria-hidden="true">
          {weekday}
        </li>
      ))}
      {Array.from({ length: leadingBlanks(month) }, (_, i) => (
        <li key={`blank-${i}`} className={styles.blank} aria-hidden="true" />
      ))}
      {days.map((day) => (
        <DayCell key={day.day} locationId={locationId} day={day} />
      ))}
    </ol>
  );
}

const dayName = (isoDate: string) =>
  new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${isoDate}T12:00:00Z`))
    .replace(".", "");

function DayCell({ locationId, day }: { locationId: string; day: OccupancyDay }) {
  if (day.closed) {
    return (
      <li className={cx(styles.day, styles.closed)}>
        <time dateTime={day.day} className={styles.dayHeader}>
          {dayName(day.day)}
        </time>
        <span className={styles.meta}>Cerrado</span>
      </li>
    );
  }
  const percent = day.percent;
  const pets = day.by_size.map((s) => `${s.pets} ${s.size}`).join(" · ");
  return (
    <li className={styles.day}>
      <span className={styles.dayHeader}>
        <time dateTime={day.day}>{dayName(day.day)}</time>
        <span className={styles.percent}>{percent === null ? "—" : `${percent} %`}</span>
      </span>
      {percent !== null && (
        <span
          className={cx(styles.bar, percent >= 100 ? styles.full : percent >= 80 && styles.warning)}
          aria-hidden="true"
        >
          <span style={{ "--fill": `${Math.min(percent, 100)}%` } as React.CSSProperties} />
        </span>
      )}
      <span className={styles.meta}>
        {day.jornadas && percent !== null
          ? `${formatFraction(day.used)} de ${formatFraction(day.jornadas)} ${
              day.jornadas.num === day.jornadas.den ? "jornada" : "jornadas"
            }`
          : "Sin bañadores en turno"}
      </span>
      {pets && <span className={styles.meta}>{pets}</span>}
      <Link
        href={`/admin/locales/${locationId}/disponibilidad?date=${day.day}`}
        className={styles.meta}
      >
        Ver horas<span className="visually-hidden"> del {dayName(day.day)}</span>
      </Link>
    </li>
  );
}
