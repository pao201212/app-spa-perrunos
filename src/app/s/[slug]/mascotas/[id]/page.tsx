import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { CustomerShell } from "@/components/customer/CustomerShell";
import { Card } from "@/components/ui";
import { ArchivePetButton } from "@/features/customers/components/ArchivePetButton";
import styles from "@/features/customers/components/customers.module.css";
import { PetForm } from "@/features/customers/components/PetForm";
import { getOwnPet, listBreedOptions } from "@/features/customers/queries";
import { requireCustomer } from "@/lib/auth/customer";

export default function EditPetPage({ params }: PageProps<"/s/[slug]/mascotas/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug, id }) => (
        <EditPetContent slug={slug} id={id} />
      ))}
    </Suspense>
  );
}

async function EditPetContent({ slug, id }: { slug: string; id: string }) {
  const { tenant, customer } = await requireCustomer(slug, `/mascotas/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [pet, breeds] = await Promise.all([
    getOwnPet(customer.id, id),
    listBreedOptions(tenant.id),
  ]);
  if (!pet) notFound();

  return (
    <CustomerShell businessName={tenant.name}>
      <h1>{pet.name}</h1>
      {pet.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pet.photoUrl} alt={`Foto de ${pet.name}`} className={styles.currentPhoto} />
      )}
      <Card>
        <PetForm slug={slug} breeds={breeds} pet={pet} />
      </Card>
      <ArchivePetButton slug={slug} petId={pet.id} petName={pet.name} />
    </CustomerShell>
  );
}
