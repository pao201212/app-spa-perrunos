import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, Button, Input, Select } from "@/components/ui";
import { parseExplainQuery, type ExplainQuery } from "@/features/capacity/explain-query";
import { explainSlots } from "@/features/capacity/queries";
import { reasonLabel, reasonMessage } from "@/features/capacity/reasons";
import styles from "@/features/locations/components/locations.module.css";
import { getLocationDetail } from "@/features/locations/queries";
import { listServices } from "@/features/services/queries";
import { requireTenantStaff } from "@/lib/auth/guards";
import { longDate } from "@/lib/dates";
import {
  COAT_TYPES,
  coatLabel,
  PET_SIZES,
  sizeLabel,
  SPECIES,
  speciesLabel,
} from "@/lib/pets/labels";
import { timeInZone, todayInZone } from "@/lib/timezone";

export const metadata: Metadata = { title: "¿Por qué no hay cupo?" };

type Params = Record<string, string | string[] | undefined>;

export default function AvailabilityPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]/admin/locales/[id]/disponibilidad">) {
  return (
    <Suspense fallback={null}>
      {Promise.all([params, searchParams]).then(([{ slug, id }, query]) => (
        <AvailabilityContent slug={slug} id={id} params={query} />
      ))}
    </Suspense>
  );
}

async function AvailabilityContent({
  slug,
  id,
  params,
}: {
  slug: string;
  id: string;
  params: Params;
}) {
  const { tenant } = await requireTenantStaff(slug, `/admin/locales/${id}/disponibilidad`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [location, services] = await Promise.all([
    getLocationDetail(tenant.id, id),
    listServices(tenant.id),
  ]);
  if (!location) notFound();

  const { query, date } = parseExplainQuery(params, todayInZone(tenant.timezone));
  const active = services.filter((s) => s.is_active);
  const main = active.filter((s) => s.kind !== "special_cut");
  const cuts = active.filter((s) => s.kind === "special_cut");
  const value = (key: keyof ExplainQuery, fallback = "") =>
    (typeof params[key] === "string" ? (params[key] as string) : "") || fallback;

  return (
    <AdminShell businessName={tenant.name}>
      <p>
        <Link href={`/admin/locales/${location.id}`}>← {location.name}</Link>
      </p>
      <h1>¿Por qué no hay cupo?</h1>
      <AdminSection
        title="Consulta"
        description="Elige el día y la mascota: verás cada hora con su entrega aproximada o el motivo por el que no se ofrece."
      >
        <form className={styles.editor}>
          <div className={styles.grid3}>
            <Input label="Día" name="date" type="date" defaultValue={date} />
            <Select
              label="Servicio"
              name="service"
              defaultValue={query?.service ?? value("service")}
            >
              <option value="">Elige un servicio</option>
              {main.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select label="Corte especial" name="cut" defaultValue={query?.cut ?? ""}>
              <option value="">Sin corte especial</option>
              {cuts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              label="Especie"
              name="species"
              defaultValue={query?.species ?? value("species", "dog")}
            >
              {SPECIES.map((species) => (
                <option key={species} value={species}>
                  {speciesLabel[species]}
                </option>
              ))}
            </Select>
            <Select label="Talla" name="size" defaultValue={query?.size ?? value("size", "M")}>
              {PET_SIZES.map((size) => (
                <option key={size} value={size}>
                  {sizeLabel[size]}
                </option>
              ))}
            </Select>
            <Select label="Pelo" name="coat" defaultValue={query?.coat ?? value("coat", "short")}>
              {COAT_TYPES.map((coat) => (
                <option key={coat} value={coat}>
                  {coatLabel[coat]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit">Ver horas</Button>
        </form>
      </AdminSection>
      {query && <Explanation locationId={location.id} query={query} timeZone={tenant.timezone} />}
    </AdminShell>
  );
}

async function Explanation({
  locationId,
  query,
  timeZone,
}: {
  locationId: string;
  query: ExplainQuery;
  timeZone: string;
}) {
  const rows = await explainSlots(locationId, query.date, [
    {
      species: query.species,
      size: query.size,
      coat: query.coat,
      services: [query.service, ...(query.cut ? [query.cut] : [])],
    },
  ]);
  const time = (iso: string) => timeInZone(iso, timeZone);
  const free = rows.filter((row) => row.code === null).length;

  return (
    <AdminSection
      title="Horas del día"
      description={`${longDate(query.date)} · ${free} disponibles`}
    >
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.starts_at ?? "day"} className={styles.row}>
            <strong className={styles.day}>
              {row.starts_at ? time(row.starts_at) : "Todo el día"}
            </strong>
            {row.code === null ? (
              <span className={styles.grow}>
                <Badge tone="success">Disponible</Badge>{" "}
                <span className={styles.muted}>entrega aprox. {time(row.estimated_ready_at!)}</span>
              </span>
            ) : (
              <span className={styles.grow}>
                <Badge tone="warning">{reasonLabel[row.code]}</Badge>{" "}
                <span className={styles.muted}>
                  {reasonMessage(row.code, row.detail, timeZone)}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </AdminSection>
  );
}
