import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { Badge, Card } from "@/components/ui";
import { AssignAdminForm } from "@/features/tenants/components/AssignAdminForm";
import { getTenantBySlugForConsole, getTenantStaff } from "@/features/tenants/queries";
import { requireSuperAdmin } from "@/lib/auth/guards";

import styles from "../../platform.module.css";

export default function TenantDetailPage({ params }: PageProps<"/platform/spas/[slug]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <TenantDetail slug={slug} />
      ))}
    </Suspense>
  );
}

async function TenantDetail({ slug }: { slug: string }) {
  await requireSuperAdmin(`/spas/${slug}`);
  const tenant = await getTenantBySlugForConsole(slug);
  if (!tenant) notFound();
  const staff = await getTenantStaff(tenant.id);

  return (
    <>
      <PlatformHeader />
      <main className={`container ${styles.page} ${styles.narrow}`}>
        <div>
          <h1>{tenant.name}</h1>
          <p className={styles.muted}>
            {tenant.slug}.prismalab.com.co · {tenant.timezone} · {tenant.currency}
          </p>
        </div>

        <Card>
          <h2 className={styles.sectionTitle}>Administradores</h2>
          {staff.length === 0 ? (
            <p className={styles.muted}>Este spa todavía no tiene administradores.</p>
          ) : (
            <ul className={styles.staffList}>
              {staff.map((member) => (
                <li key={member.email} className={styles.staffItem}>
                  <span className="break-anywhere">{member.email}</span>
                  <Badge tone={member.status === "active" ? "success" : "warning"}>
                    {member.status === "active" ? "Activo" : "Invitación pendiente"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <AssignAdminForm tenantId={tenant.id} />
        </Card>
      </main>
    </>
  );
}
