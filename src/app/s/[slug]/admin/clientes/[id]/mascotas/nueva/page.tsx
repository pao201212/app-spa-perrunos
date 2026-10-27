import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui";
import { saveCustomerPetAction } from "@/features/customers/admin-actions";
import { getCustomerForStaff } from "@/features/customers/admin-queries";
import { PetForm } from "@/features/customers/components/PetForm";
import { listBreedOptions } from "@/features/customers/queries";
import { requireTenantStaff } from "@/lib/auth/guards";

export default function NewCustomerPetPage({
  params,
}: PageProps<"/s/[slug]/admin/clientes/[id]/mascotas/nueva">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug, id }) => (
        <NewCustomerPetContent slug={slug} id={id} />
      ))}
    </Suspense>
  );
}

async function NewCustomerPetContent({ slug, id }: { slug: string; id: string }) {
  const { tenant } = await requireTenantStaff(slug, `/admin/clientes/${id}/mascotas/nueva`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [customer, breeds] = await Promise.all([
    getCustomerForStaff(tenant.id, id),
    listBreedOptions(tenant.id),
  ]);
  if (!customer) notFound();

  return (
    <AdminShell businessName={tenant.name}>
      <h1>Nueva mascota de {customer.full_name}</h1>
      <Card>
        <PetForm
          action={saveCustomerPetAction.bind(null, slug, customer.id, null)}
          breeds={breeds}
          allowOverride
        />
      </Card>
    </AdminShell>
  );
}
