import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, useId } from "react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { buttonClassName, Card } from "@/components/ui";
import styles from "@/features/catalog/catalog.module.css";
import {
  getPublicCatalog,
  getPublicLocations,
  type PublicService,
} from "@/features/catalog/queries";
import { serviceSpeciesLabel } from "@/features/services/schema";
import { copy } from "@/lib/copy";
import { formatCop } from "@/lib/money";
import { getTenant } from "@/lib/tenancy/get-tenant";

export const metadata: Metadata = { title: "Servicios" };

export default function ServicesCatalogPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]/servicios">) {
  return (
    <Suspense fallback={null}>
      {Promise.all([params, searchParams]).then(([{ slug }, query]) => (
        <Catalog slug={slug} locationParam={typeof query.local === "string" ? query.local : null} />
      ))}
    </Suspense>
  );
}

async function Catalog({ slug, locationParam }: { slug: string; locationParam: string | null }) {
  const tenant = await getTenant(slug);
  const locations = await getPublicLocations(tenant.id);
  const location = locations.find((l) => l.id === locationParam) ?? locations[0];
  const services = location ? await getPublicCatalog(tenant.id, location.id) : [];

  const categories = new Map<string, PublicService[]>();
  for (const service of [...services].sort((a, b) => a.categoryOrder - b.categoryOrder)) {
    categories.set(service.category, [...(categories.get(service.category) ?? []), service]);
  }

  return (
    <>
      <SiteHeader businessName={tenant.name} />
      <main className={`container ${styles.page}`}>
        <div>
          <h1>Servicios</h1>
          <p className={styles.muted}>Los precios dependen de la talla y el pelo de tu mascota.</p>
        </div>

        {locations.length > 1 && location && (
          <nav aria-label="Locales" className={styles.tabs}>
            {locations.map((l) => (
              <Link
                key={l.id}
                href={`/servicios?local=${l.id}`}
                className={styles.tab}
                aria-current={l.id === location.id ? "page" : undefined}
              >
                {l.name}
              </Link>
            ))}
          </nav>
        )}

        {services.length === 0 ? (
          <Card>
            <p>Pronto publicaremos nuestros servicios. Escríbenos para más información.</p>
          </Card>
        ) : (
          [...categories.entries()].map(([category, items]) => (
            <CategorySection key={category} title={category} services={items} />
          ))
        )}

        <Link href="/reservar" className={buttonClassName({ size: "lg" })}>
          {copy.landing.bookCta}
        </Link>
      </main>
    </>
  );
}

function CategorySection({ title, services }: { title: string; services: PublicService[] }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={styles.category}>
      <h2 id={headingId}>{title}</h2>
      <ul className={styles.services}>
        {services.map((service) => (
          <li key={service.id}>
            <Card className={styles.serviceCard}>
              <div className={styles.serviceHead}>
                <h3 className={styles.serviceName}>{service.name}</h3>
                <span className={styles.price}>Desde {formatCop(service.fromPrice)}</span>
              </div>
              <span className={styles.muted}>{serviceSpeciesLabel[service.species]}</span>
              {service.description && <p>{service.description}</p>}
              {service.extras.length > 0 && (
                <>
                  <span className={styles.muted}>Extras opcionales:</span>
                  <ul className={styles.extras}>
                    {service.extras.map((extra) => (
                      <li key={extra.id}>
                        {extra.name} · desde {formatCop(extra.fromPrice)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
