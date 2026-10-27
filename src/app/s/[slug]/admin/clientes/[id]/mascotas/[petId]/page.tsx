import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui";
import {
  archiveCustomerPetAction,
  saveCustomerPetAction,
} from "@/features/customers/admin-actions";
import { getCustomerForStaff, getCustomerPet } from "@/features/customers/admin-queries";
import { ArchivePetButton } from "@/features/customers/components/ArchivePetButton";
import styles from "@/features/customers/components/customers.module.css";
import { PetForm } from "@/features/customers/components/PetForm";
import { listBreedOptions } from "@/features/customers/queries";
import { requireTenantStaff } from "@/lib/auth/guards";

export default function EditCustomerPetPage({
  params,
}: PageProps<"/s/[slug]/admin/clientes/[id]/mascotas/[petId]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug, id, petId }) => (
        <EditCustomerPetContent slug={slug} id={id} petId={petId} />
      ))}
    </Suspense>
  );
}

async function EditCustomerPetContent({
  slug,
  id,
  petId,
}: {
  slug: string;
  id: string;
  petId: string;
}) {
  const { tenant } = await requireTenantStaff(slug, `/admin/clientes/${id}/mascotas/${petId}`);
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(petId).success) notFound();
  const [customer, pet, breeds] = await Promise.all([
    getCustomerForStaff(tenant.id, id),
    getCustomerPet(id, petId),
    listBreedOptions(tenant.id),
  ]);
  if (!customer || !pet) notFound();

  return (
    <AdminShell businessName={tenant.name}>
      <h1>
        {pet.name} · {customer.full_name}
      </h1>
      {pet.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pet.photoUrl} alt={`Foto de ${pet.name}`} className={styles.currentPhoto} />
      )}
      <Card>
        <PetForm
          action={saveCustomerPetAction.bind(null, slug, customer.id, pet.id)}
          breeds={breeds}
          pet={pet}
          allowOverride
        />
      </Card>
      <ArchivePetButton
        action={archiveCustomerPetAction.bind(null, slug, customer.id, pet.id)}
        petName={pet.name}
      />
    </AdminShell>
  );
}
