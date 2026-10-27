import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui";
import { TenantBreedForm } from "@/features/pet-catalog/components/TenantBreedForm";
import { requireTenantStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Nueva raza" };

export default function NewBreedPage({ params }: PageProps<"/s/[slug]/admin/razas/nueva">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <NewBreedContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function NewBreedContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/razas/nueva");
  return (
    <AdminShell businessName={tenant.name}>
      <h1>Nueva raza</h1>
      <Card>
        <TenantBreedForm slug={slug} />
      </Card>
    </AdminShell>
  );
}
