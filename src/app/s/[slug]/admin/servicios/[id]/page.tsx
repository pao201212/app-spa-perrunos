import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExtrasEditor } from "@/features/services/components/ExtrasEditor";
import { ServiceForm } from "@/features/services/components/ServiceForm";
import { getService, listCategories } from "@/features/services/queries";
import { kindDescription } from "@/features/services/schema";
import { requireTenantStaff } from "@/lib/auth/guards";

export default function ServiceDetailPage({ params }: PageProps<"/s/[slug]/admin/servicios/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug, id }) => (
        <ServiceDetailContent slug={slug} id={id} />
      ))}
    </Suspense>
  );
}

async function ServiceDetailContent({ slug, id }: { slug: string; id: string }) {
  const { tenant } = await requireTenantStaff(slug, `/admin/servicios/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [service, categories] = await Promise.all([
    getService(tenant.id, id),
    listCategories(tenant.id),
  ]);
  if (!service) notFound();

  return (
    <AdminShell businessName={tenant.name}>
      <div>
        <h1>{service.name}</h1>
        <p>{kindDescription[service.kind]}</p>
      </div>
      <AdminSection title="Datos del servicio">
        <ServiceForm slug={slug} categories={categories} service={service} />
      </AdminSection>
      <AdminSection
        title="Extras"
        description="Opciones que el cliente puede sumar a este servicio."
      >
        <ExtrasEditor slug={slug} service={service} />
      </AdminSection>
    </AdminShell>
  );
}
