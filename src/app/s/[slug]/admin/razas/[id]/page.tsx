import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui";
import { BreedDangerZone } from "@/features/pet-catalog/components/BreedDangerZone";
import { TenantBreedForm } from "@/features/pet-catalog/components/TenantBreedForm";
import { getTenantBreed } from "@/features/pet-catalog/queries";
import { requireTenantStaff } from "@/lib/auth/guards";
import { speciesLabel } from "@/lib/pets/labels";

export default function EditBreedPage({ params }: PageProps<"/s/[slug]/admin/razas/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug, id }) => (
        <EditBreedContent slug={slug} id={id} />
      ))}
    </Suspense>
  );
}

async function EditBreedContent({ slug, id }: { slug: string; id: string }) {
  const { tenant } = await requireTenantStaff(slug, `/admin/razas/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const breed = await getTenantBreed(tenant.id, id);
  if (!breed) notFound();

  return (
    <AdminShell businessName={tenant.name}>
      <div>
        <h1>{breed.name}</h1>
        <p>
          {speciesLabel[breed.species]} ·{" "}
          {breed.global_breed_id ? "Del catálogo de Prisma Lab" : "Raza propia"}
        </p>
      </div>
      <Card>
        <TenantBreedForm slug={slug} breed={breed} />
      </Card>
      <BreedDangerZone slug={slug} breed={breed} />
    </AdminShell>
  );
}
