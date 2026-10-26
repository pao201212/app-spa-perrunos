import type { Metadata } from "next";
import { Suspense } from "react";

import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { Card } from "@/components/ui";
import { TenantForm } from "@/features/tenants/components/TenantForm";
import { requireSuperAdmin } from "@/lib/auth/guards";

import styles from "../../platform.module.css";

export const metadata: Metadata = { title: "Nuevo spa" };

export default function NewTenantPage() {
  return (
    <Suspense fallback={null}>
      <NewTenantContent />
    </Suspense>
  );
}

async function NewTenantContent() {
  await requireSuperAdmin("/spas/nuevo");
  return (
    <>
      <PlatformHeader />
      <main className={`container ${styles.page} ${styles.narrow}`}>
        <h1>Nuevo spa</h1>
        <Card>
          <TenantForm />
        </Card>
        <p className={styles.muted}>
          Después de crearlo, agrega su identidad visual en el repo:{" "}
          <code>tenants/&#123;subdominio&#125;/theme.css</code>. Mientras tanto se verá con el tema
          de Prisma Lab.
        </p>
      </main>
    </>
  );
}
