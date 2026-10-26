import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomerShell } from "@/components/customer/CustomerShell";
import { BookingWizard } from "@/features/booking/components/BookingWizard";
import { getBookingCatalog } from "@/features/booking/queries";
import { listOwnPets } from "@/features/customers/queries";
import { requireCustomer } from "@/lib/auth/customer";
import { todayInZone } from "@/lib/timezone";

export const metadata: Metadata = { title: "Reservar" };

export default function BookingPage({ params }: PageProps<"/s/[slug]/reservar">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <BookingContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function BookingContent({ slug }: { slug: string }) {
  const { tenant, customer } = await requireCustomer(slug, "/reservar");
  const [pets, catalog] = await Promise.all([
    listOwnPets(customer.id),
    getBookingCatalog(tenant.id),
  ]);

  return (
    <CustomerShell businessName={tenant.name}>
      <h1>Reservar</h1>
      <BookingWizard
        slug={slug}
        pets={pets.map(({ id, name, species, size, coat }) => ({ id, name, species, size, coat }))}
        catalog={catalog}
        today={todayInZone(tenant.timezone)}
      />
    </CustomerShell>
  );
}
