import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, buttonClassName, Card } from "@/components/ui";
import { CategoriesEditor } from "@/features/services/components/CategoriesEditor";
import styles from "@/features/services/components/services.module.css";
import { listCategories, listServices, type ServiceSummary } from "@/features/services/queries";
import { kindLabel, serviceSpeciesLabel } from "@/features/services/schema";
import { requireTenantStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Servicios" };

export default function ServicesPage({ params }: PageProps<"/s/[slug]/admin/servicios">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <ServicesContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function ServicesContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/servicios");
  const [services, categories] = await Promise.all([
    listServices(tenant.id),
    listCategories(tenant.id),
  ]);

  const groups = new Map<string, ServiceSummary[]>();
  for (const service of services) {
    const key = service.service_categories?.name ?? "Sin categoría";
    groups.set(key, [...(groups.get(key) ?? []), service]);
  }

  return (
    <AdminShell businessName={tenant.name}>
      <div className={styles.titleRow}>
        <h1>Servicios</h1>
        <Link href="/admin/servicios/nuevo" className={buttonClassName()}>
          Nuevo servicio
        </Link>
      </div>

      {services.length === 0 ? (
        <Card>
          <p>Aún no tienes servicios. Crea el primero, por ejemplo “Baño”.</p>
        </Card>
      ) : (
        [...groups.entries()].map(([category, items]) => (
          <section key={category} aria-label={category}>
            <h2 className={styles.categoryTitle}>{category}</h2>
            <ul className={styles.cards}>
              {items.map((service) => (
                <li key={service.id}>
                  <Card className={styles.serviceCard}>
                    <Link href={`/admin/servicios/${service.id}`} className={styles.serviceName}>
                      {service.name}
                    </Link>
                    <span className={styles.badges}>
                      <Badge tone="primary">{kindLabel[service.kind]}</Badge>
                      <Badge tone="neutral">{serviceSpeciesLabel[service.species]}</Badge>
                      {service.extraCount > 0 && (
                        <Badge tone="neutral">
                          {service.extraCount} {service.extraCount === 1 ? "extra" : "extras"}
                        </Badge>
                      )}
                      {!service.is_active && <Badge tone="warning">Inactivo</Badge>}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <AdminSection title="Categorías" description="Agrupan los servicios en el catálogo.">
        <CategoriesEditor slug={slug} categories={categories} />
      </AdminSection>
    </AdminShell>
  );
}
