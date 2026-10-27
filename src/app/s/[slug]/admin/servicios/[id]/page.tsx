import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminShell } from "@/components/admin/AdminShell";
import { buttonClassName } from "@/components/ui";
import { DurationMatrixForm } from "@/features/services/components/DurationMatrixForm";
import { ExtrasEditor } from "@/features/services/components/ExtrasEditor";
import { OptionsEditor } from "@/features/services/components/OptionsEditor";
import { ServiceForm } from "@/features/services/components/ServiceForm";
import { getService, getServiceDurations, listCategories } from "@/features/services/queries";
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
  const [service, categories, durations] = await Promise.all([
    getService(tenant.id, id),
    listCategories(tenant.id),
    getServiceDurations(id),
  ]);
  if (!service) notFound();

  return (
    <AdminShell businessName={tenant.name}>
      <div>
        <h1>{service.name}</h1>
        <p>{kindDescription[service.kind]}</p>
        <Link
          href={`/admin/servicios/${service.id}/precios`}
          className={buttonClassName({ variant: "ghost" })}
        >
          Precios por local
        </Link>
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
      {service.kind === "bath" && (
        <AdminSection
          title="Opcionales sin costo"
          description="El cliente los marca al reservar. Indica si se hacen en el baño o en los detalles."
        >
          <OptionsEditor slug={slug} service={service} />
        </AdminSection>
      )}
      <AdminSection
        title="Duraciones"
        description="Minutos de cada etapa según talla y tipo de pelo. Son iguales en todos los locales."
      >
        <DurationMatrixForm
          slug={slug}
          serviceId={service.id}
          kind={service.kind}
          durations={durations}
        />
      </AdminSection>
    </AdminShell>
  );
}
