import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, buttonClassName, Card } from "@/components/ui";
import styles from "@/features/staff/components/staff.module.css";
import { listStaff } from "@/features/staff/queries";
import { skillLabel } from "@/features/staff/schema";
import { requireTenantStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Personal" };

export default function StaffPage({ params }: PageProps<"/s/[slug]/admin/personal">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <StaffContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function StaffContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/personal");
  const people = await listStaff(tenant.id);

  return (
    <AdminShell businessName={tenant.name}>
      <div className={styles.titleRow}>
        <h1>Personal</h1>
        <Link href="/admin/personal/nuevo" className={buttonClassName()}>
          Nuevo integrante
        </Link>
      </div>
      {people.length === 0 ? (
        <Card>
          <p>
            Registra a tu equipo para que el sistema pueda asignar las citas según turnos y
            habilidades.
          </p>
        </Card>
      ) : (
        <ul className={styles.cards}>
          {people.map((person) => (
            <li key={person.id}>
              <Card>
                <Link href={`/admin/personal/${person.id}`} className={styles.cardTitle}>
                  {person.name}
                </Link>
                <span className={styles.badges}>
                  {person.staff_skills.map(({ skill }) => (
                    <Badge key={skill} tone="primary">
                      {skillLabel[skill]}
                    </Badge>
                  ))}
                  {!person.is_active && <Badge tone="neutral">Inactiva</Badge>}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
