import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomerShell } from "@/components/customer/CustomerShell";
import { Card } from "@/components/ui";
import { PetForm } from "@/features/customers/components/PetForm";
import { listBreedOptions } from "@/features/customers/queries";
import { requireCustomer } from "@/lib/auth/customer";

export const metadata: Metadata = { title: "Nueva mascota" };

export default function NewPetPage({ params }: PageProps<"/s/[slug]/mascotas/nueva">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <NewPetContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function NewPetContent({ slug }: { slug: string }) {
  const { tenant } = await requireCustomer(slug, "/mascotas/nueva");
  const breeds = await listBreedOptions(tenant.id);
  return (
    <CustomerShell businessName={tenant.name}>
      <h1>Nueva mascota</h1>
      <Card>
        <PetForm slug={slug} breeds={breeds} />
      </Card>
    </CustomerShell>
  );
}
