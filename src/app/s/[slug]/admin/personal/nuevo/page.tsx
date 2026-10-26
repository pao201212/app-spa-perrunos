import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui";
import { StaffForm } from "@/features/staff/components/StaffForm";
import { requireTenantStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Nuevo integrante" };

export default function NewStaffPage({ params }: PageProps<"/s/[slug]/admin/personal/nuevo">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <NewStaffContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function NewStaffContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/personal/nuevo");
  return (
    <AdminShell businessName={tenant.name}>
      <h1>Nuevo integrante</h1>
      <Card>
        <StaffForm slug={slug} />
      </Card>
    </AdminShell>
  );
}
