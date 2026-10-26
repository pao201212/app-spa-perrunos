import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CustomerShell } from "@/components/customer/CustomerShell";
import { buttonClassName, Card } from "@/components/ui";
import styles from "@/features/customers/components/customers.module.css";
import { PetList } from "@/features/customers/components/PetList";
import { listOwnPets } from "@/features/customers/queries";
import { requireCustomer } from "@/lib/auth/customer";

export const metadata: Metadata = { title: "Mis mascotas" };

export default function PetsPage({ params }: PageProps<"/s/[slug]/mascotas">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <PetsContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function PetsContent({ slug }: { slug: string }) {
  const { tenant, customer } = await requireCustomer(slug, "/mascotas");
  const pets = await listOwnPets(customer.id);

  return (
    <CustomerShell businessName={tenant.name}>
      <div className={styles.titleRow}>
        <h1>Mis mascotas</h1>
        <Link href="/mascotas/nueva" className={buttonClassName()}>
          Agregar mascota
        </Link>
      </div>
      {pets.length === 0 ? (
        <Card>
          <p>Aún no tienes mascotas registradas. Agrega la primera para poder reservar.</p>
        </Card>
      ) : (
        <PetList pets={pets} editHref={(petId) => `/mascotas/${petId}`} />
      )}
    </CustomerShell>
  );
}
