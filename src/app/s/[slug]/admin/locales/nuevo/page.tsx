import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui";
import { LocationDetailsForm } from "@/features/locations/components/LocationDetailsForm";
import { requireTenantStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Nuevo local" };

export default function NewLocationPage({ params }: PageProps<"/s/[slug]/admin/locales/nuevo">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <NewLocationContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function NewLocationContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/locales/nuevo");
  return (
    <AdminShell businessName={tenant.name}>
      <h1>Nuevo local</h1>
      <Card>
        <LocationDetailsForm slug={slug} />
      </Card>
    </AdminShell>
  );
}
