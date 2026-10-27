import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminShell } from "@/components/admin/AdminShell";
import { listLocations } from "@/features/locations/queries";
import { AbsencesEditor } from "@/features/staff/components/AbsencesEditor";
import { ShiftsEditor } from "@/features/staff/components/ShiftsEditor";
import { StaffForm } from "@/features/staff/components/StaffForm";
import { getStaffDetail } from "@/features/staff/queries";
import { requireTenantStaff } from "@/lib/auth/guards";

export default function StaffDetailPage({ params }: PageProps<"/s/[slug]/admin/personal/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug, id }) => (
        <StaffDetailContent slug={slug} id={id} />
      ))}
    </Suspense>
  );
}

async function StaffDetailContent({ slug, id }: { slug: string; id: string }) {
  const { tenant } = await requireTenantStaff(slug, `/admin/personal/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [member, locations] = await Promise.all([
    getStaffDetail(tenant.id, id),
    listLocations(tenant.id),
  ]);
  if (!member) notFound();

  return (
    <AdminShell businessName={tenant.name}>
      <h1>{member.name}</h1>
      <AdminSection title="Datos">
        <StaffForm slug={slug} member={member} />
      </AdminSection>
      <AdminSection
        title="Turnos"
        description="Horario semanal por local. Una persona no puede estar en dos turnos a la vez."
      >
        <ShiftsEditor
          slug={slug}
          member={member}
          locations={locations.filter((l) => l.is_active)}
        />
      </AdminSection>
      <AdminSection
        title="Ausencias"
        description={`Vacaciones, incapacidades o permisos. Hora de ${tenant.timezone}.`}
      >
        <AbsencesEditor slug={slug} member={member} timeZone={tenant.timezone} />
      </AdminSection>
    </AdminShell>
  );
}
