import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, buttonClassName, Card } from "@/components/ui";
import styles from "@/features/locations/components/locations.module.css";
import { listLocations } from "@/features/locations/queries";
import { requireTenantStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Locales" };

export default function LocationsPage({ params }: PageProps<"/s/[slug]/admin/locales">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <LocationsContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function LocationsContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/locales");
  const locations = await listLocations(tenant.id);

  return (
    <AdminShell businessName={tenant.name}>
      <div className={styles.titleRow}>
        <h1>Locales</h1>
        <Link href="/admin/locales/nuevo" className={buttonClassName()}>
          Nuevo local
        </Link>
      </div>
      {locations.length === 0 ? (
        <Card>
          <p>Aún no tienes locales. Crea el primero para empezar a recibir reservas.</p>
        </Card>
      ) : (
        <ul className={styles.cards}>
          {locations.map((location) => (
            <li key={location.id}>
              <Card>
                <Link href={`/admin/locales/${location.id}`} className={styles.cardTitle}>
                  {location.name}
                </Link>
                {location.address && <span className={styles.muted}>{location.address}</span>}
                <Badge tone={location.is_active ? "success" : "neutral"}>
                  {location.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
