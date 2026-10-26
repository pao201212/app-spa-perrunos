import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, buttonClassName, Card } from "@/components/ui";
import { listLocations } from "@/features/locations/queries";
import { CopyPricesButton } from "@/features/services/components/CopyPricesButton";
import { PriceMatrixForm } from "@/features/services/components/PriceMatrixForm";
import type { Combo } from "@/features/services/price-matrix";
import styles from "@/features/services/components/prices.module.css";
import { getLocationPrices, getService, getServiceDurations } from "@/features/services/queries";
import { requireTenantStaff } from "@/lib/auth/guards";

export default function ServicePricesPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]/admin/servicios/[id]/precios">) {
  return (
    <Suspense fallback={null}>
      {Promise.all([params, searchParams]).then(([{ slug, id }, query]) => (
        <ServicePricesContent
          slug={slug}
          id={id}
          locationParam={typeof query.local === "string" ? query.local : null}
        />
      ))}
    </Suspense>
  );
}

async function ServicePricesContent({
  slug,
  id,
  locationParam,
}: {
  slug: string;
  id: string;
  locationParam: string | null;
}) {
  const { tenant } = await requireTenantStaff(slug, `/admin/servicios/${id}/precios`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [service, durations, locations] = await Promise.all([
    getService(tenant.id, id),
    getServiceDurations(id),
    listLocations(tenant.id),
  ]);
  if (!service) notFound();

  const location = locations.find((l) => l.id === locationParam) ?? locations[0];
  const offered = durations.map(({ size, coat }) => ({ size, coat }));

  return (
    <AdminShell businessName={tenant.name}>
      <div>
        <h1>Precios · {service.name}</h1>
        <Link href={`/admin/servicios/${service.id}`}>Volver al servicio</Link>
      </div>

      {offered.length === 0 ? (
        <Card>
          <p>
            Primero define las duraciones de este servicio: los precios se fijan para esas
            combinaciones.
          </p>
          <Link
            href={`/admin/servicios/${service.id}`}
            className={buttonClassName({ variant: "ghost" })}
          >
            Ir a duraciones
          </Link>
        </Card>
      ) : !location ? (
        <Card>
          <p>Crea un local para fijar precios.</p>
        </Card>
      ) : (
        <PricesForLocation
          slug={slug}
          service={service}
          offered={offered}
          location={location}
          locations={locations}
        />
      )}
    </AdminShell>
  );
}

async function PricesForLocation({
  slug,
  service,
  offered,
  location,
  locations,
}: {
  slug: string;
  service: NonNullable<Awaited<ReturnType<typeof getService>>>;
  offered: Combo[];
  location: { id: string; name: string };
  locations: { id: string; name: string }[];
}) {
  const prices = await getLocationPrices(location.id, service.id);
  const isOffered = prices.service.length === offered.length;
  const activeExtras = service.extras.filter((extra) => extra.is_active);

  return (
    <>
      <nav aria-label="Locales" className={styles.tabs}>
        {locations.map((l) => (
          <Link
            key={l.id}
            href={`/admin/servicios/${service.id}/precios?local=${l.id}`}
            className={styles.tab}
            aria-current={l.id === location.id ? "page" : undefined}
          >
            {l.name}
          </Link>
        ))}
      </nav>
      <div className={styles.toolbar}>
        <Badge tone={isOffered ? "success" : "warning"}>
          {isOffered ? "Se ofrece en este local" : "No se ofrece en este local"}
        </Badge>
        {locations.length > 1 && (
          <CopyPricesButton
            slug={slug}
            serviceId={service.id}
            locationId={location.id}
            locationName={location.name}
            others={locations.length - 1}
          />
        )}
      </div>
      <PriceMatrixForm
        key={location.id}
        slug={slug}
        serviceId={service.id}
        serviceName={service.name}
        locationId={location.id}
        offered={offered}
        extras={activeExtras.map(({ id, name }) => ({ id, name }))}
        prices={prices}
      />
    </>
  );
}
