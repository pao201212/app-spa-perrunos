import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui";
import { createCustomerAction } from "@/features/customers/admin-actions";
import { CustomerAdminForm } from "@/features/customers/components/CustomerAdminForm";
import { requireTenantStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Inscribir cliente" };

export default function NewCustomerPage({ params }: PageProps<"/s/[slug]/admin/clientes/nuevo">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <NewCustomerContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function NewCustomerContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/clientes/nuevo");
  return (
    <AdminShell businessName={tenant.name}>
      <h1>Inscribir cliente</h1>
      <Card>
        <CustomerAdminForm action={createCustomerAction.bind(null, slug)} />
      </Card>
    </AdminShell>
  );
}
