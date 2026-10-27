import Link from "next/link";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui";
import { requireTenantStaff } from "@/lib/auth/guards";
import { ADMIN_PATH } from "@/lib/auth/roles";
import { copy } from "@/lib/copy";

export default function AdminHome({ params }: PageProps<"/s/[slug]/admin">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <AdminHomeContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function AdminHomeContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, ADMIN_PATH);
  return (
    <AdminShell businessName={tenant.name}>
      <h1>{copy.admin.panelTitle(tenant.name)}</h1>
      <Card>
        <h2>Primeros pasos</h2>
        <p>
          Configura tus <Link href="/admin/locales">locales</Link>: estaciones, horario y días de
          cierre.
        </p>
      </Card>
    </AdminShell>
  );
}
