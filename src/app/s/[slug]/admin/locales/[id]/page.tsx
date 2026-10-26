import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminShell } from "@/components/admin/AdminShell";
import { BookingSettingsForm } from "@/features/locations/components/BookingSettingsForm";
import { ClosuresEditor } from "@/features/locations/components/ClosuresEditor";
import { HoursEditor } from "@/features/locations/components/HoursEditor";
import { LocationDetailsForm } from "@/features/locations/components/LocationDetailsForm";
import { StationsForm } from "@/features/locations/components/StationsForm";
import { getLocationDetail } from "@/features/locations/queries";
import { requireTenantStaff } from "@/lib/auth/guards";

export default function LocationDetailPage({ params }: PageProps<"/s/[slug]/admin/locales/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug, id }) => (
        <LocationDetailContent slug={slug} id={id} />
      ))}
    </Suspense>
  );
}

async function LocationDetailContent({ slug, id }: { slug: string; id: string }) {
  const { tenant } = await requireTenantStaff(slug, `/admin/locales/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const location = await getLocationDetail(tenant.id, id);
  if (!location) notFound();

  return (
    <AdminShell businessName={tenant.name}>
      <h1>{location.name}</h1>
      <AdminSection title="Datos del local">
        <LocationDetailsForm slug={slug} location={location} />
      </AdminSection>
      <AdminSection
        title="Reservas"
        description="Cómo y con cuánta anticipación reservan los clientes en este local."
      >
        <BookingSettingsForm slug={slug} location={location} />
      </AdminSection>
      <AdminSection
        title="Estaciones"
        description="Cuántas mascotas pueden estar a la vez en cada etapa."
      >
        <StationsForm slug={slug} location={location} />
      </AdminSection>
      <AdminSection
        title="Horario"
        description="Puedes tener varios tramos por día (p. ej. mañana y tarde)."
      >
        <HoursEditor slug={slug} location={location} />
      </AdminSection>
      <AdminSection
        title="Días de cierre"
        description="Festivos o vacaciones: ese día no se ofrecen horarios."
      >
        <ClosuresEditor slug={slug} location={location} />
      </AdminSection>
    </AdminShell>
  );
}
