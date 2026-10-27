import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminShell } from "@/components/admin/AdminShell";
import { buttonClassName } from "@/components/ui";
import styles from "@/features/pet-catalog/components/pet-catalog.module.css";
import { TenantBreedList } from "@/features/pet-catalog/components/TenantBreedList";
import { ThresholdsForm } from "@/features/pet-catalog/components/ThresholdsForm";
import { getSizeThresholds, listTenantBreeds } from "@/features/pet-catalog/queries";
import { requireTenantStaff } from "@/lib/auth/guards";
import { SPECIES } from "@/lib/pets/labels";

export const metadata: Metadata = { title: "Razas y tallas" };

export default function BreedsPage({ params }: PageProps<"/s/[slug]/admin/razas">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <BreedsContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function BreedsContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/razas");
  const [breeds, thresholds] = await Promise.all([
    listTenantBreeds(tenant.id),
    getSizeThresholds(tenant.id),
  ]);

  return (
    <AdminShell businessName={tenant.name}>
      <div className={styles.titleRow}>
        <h1>Razas y tallas</h1>
        <Link href="/admin/razas/nueva" className={buttonClassName()}>
          Nueva raza
        </Link>
      </div>
      <AdminSection
        title="Tallas por peso"
        description="Si el cliente indica el peso de su mascota, la talla sale de esta tabla; si no, de la raza."
      >
        {SPECIES.map((species) => (
          <ThresholdsForm key={species} slug={slug} species={species} thresholds={thresholds} />
        ))}
      </AdminSection>
      <AdminSection
        title="Razas del spa"
        description="Heredadas del catálogo de Prisma Lab. Puedes ajustar su talla y pelo, ocultarlas o crear razas propias."
      >
        <TenantBreedList breeds={breeds} />
      </AdminSection>
    </AdminShell>
  );
}
