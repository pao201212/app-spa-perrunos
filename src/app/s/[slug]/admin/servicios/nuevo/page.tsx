import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui";
import { ServiceForm } from "@/features/services/components/ServiceForm";
import { listCategories } from "@/features/services/queries";
import { requireTenantStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Nuevo servicio" };

export default function NewServicePage({ params }: PageProps<"/s/[slug]/admin/servicios/nuevo">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <NewServiceContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function NewServiceContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/servicios/nuevo");
  const categories = await listCategories(tenant.id);
  return (
    <AdminShell businessName={tenant.name}>
      <h1>Nuevo servicio</h1>
      <Card>
        <ServiceForm slug={slug} categories={categories} />
      </Card>
    </AdminShell>
  );
}
