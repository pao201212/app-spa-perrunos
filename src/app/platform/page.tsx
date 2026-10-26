import Link from "next/link";
import { Suspense } from "react";

import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { Badge, buttonClassName, Card } from "@/components/ui";
import { listTenants } from "@/features/tenants/queries";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { copy } from "@/lib/copy";

import styles from "./platform.module.css";

export default function PlatformHome() {
  return (
    <Suspense fallback={null}>
      <PlatformHomeContent />
    </Suspense>
  );
}

async function PlatformHomeContent() {
  await requireSuperAdmin("/");
  const tenants = await listTenants();

  return (
    <>
      <PlatformHeader />
      <main className={`container ${styles.page}`}>
        <div className={styles.titleRow}>
          <h1>{copy.platform.title}</h1>
          <Link href="/spas/nuevo" className={buttonClassName()}>
            Nuevo spa
          </Link>
        </div>
        <h2 className={styles.sectionTitle}>Spas ({tenants.length})</h2>
        <ul className={styles.grid}>
          {tenants.map((tenant) => (
            <li key={tenant.id}>
              <Card className={styles.tenantCard}>
                <Link href={`/spas/${tenant.slug}`} className={styles.tenantName}>
                  {tenant.name}
                </Link>
                <span className={styles.muted}>{tenant.slug}.prismalab.com.co</span>
                <Badge tone={tenant.is_active ? "success" : "neutral"}>
                  {tenant.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
