import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button, buttonClassName, Card, Input } from "@/components/ui";
import { adminBookAction, adminLoadSlotsAction } from "@/features/booking/admin-actions";
import { BookingWizard } from "@/features/booking/components/BookingWizard";
import { getBookingCatalog } from "@/features/booking/queries";
import {
  getCustomerForStaff,
  listCustomerPets,
  searchCustomers,
} from "@/features/customers/admin-queries";
import styles from "@/features/customers/components/customers.module.css";
import { requireTenantStaff } from "@/lib/auth/guards";
import { todayInZone } from "@/lib/timezone";

export const metadata: Metadata = { title: "Nueva cita" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function NewAppointmentPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]/admin/citas/nueva">) {
  return (
    <Suspense fallback={null}>
      {Promise.all([params, searchParams]).then(([{ slug }, query]) => (
        <NewAppointmentContent slug={slug} customerId={first(query.cliente)} q={first(query.q)} />
      ))}
    </Suspense>
  );
}

async function NewAppointmentContent({
  slug,
  customerId,
  q,
}: {
  slug: string;
  customerId?: string;
  q?: string;
}) {
  const { tenant } = await requireTenantStaff(slug, "/admin/citas/nueva");
  const customer =
    customerId && z.uuid().safeParse(customerId).success
      ? await getCustomerForStaff(tenant.id, customerId)
      : null;

  if (!customer) {
    return (
      <AdminShell businessName={tenant.name}>
        <h1>Nueva cita</h1>
        <CustomerPicker tenantId={tenant.id} q={q ?? ""} />
      </AdminShell>
    );
  }

  const [pets, catalog] = await Promise.all([
    listCustomerPets(customer.id),
    getBookingCatalog(tenant.id),
  ]);
  return (
    <AdminShell businessName={tenant.name}>
      <p>
        <Link href="/admin/citas/nueva">← Elegir otro cliente</Link>
      </p>
      <h1>Nueva cita para {customer.full_name}</h1>
      <BookingWizard
        staff
        pets={pets.map(({ id, name, species, size, coat }) => ({ id, name, species, size, coat }))}
        catalog={catalog}
        today={todayInZone(tenant.timezone)}
        fetchSlots={adminLoadSlotsAction.bind(null, slug, customer.id)}
        submitBooking={adminBookAction.bind(null, slug, customer.id)}
        addPetHref={`/admin/clientes/${customer.id}/mascotas/nueva`}
        done={{ href: `/admin/clientes/${customer.id}`, label: "Ver cliente" }}
      />
    </AdminShell>
  );
}

async function CustomerPicker({ tenantId, q }: { tenantId: string; q: string }) {
  const customers = q ? await searchCustomers(tenantId, q) : [];
  return (
    <>
      <form role="search" className={styles.search}>
        <Input
          label="Buscar cliente"
          name="q"
          type="search"
          placeholder="Nombre, WhatsApp o correo"
          defaultValue={q}
        />
        <Button type="submit" variant="ghost">
          Buscar
        </Button>
      </form>
      <p>
        ¿Cliente nuevo? <Link href="/admin/clientes/nuevo">Inscríbelo</Link> y luego crea la cita
        desde su ficha.
      </p>
      {q && customers.length === 0 && (
        <Card>
          <p>No encontramos clientes con esa búsqueda.</p>
        </Card>
      )}
      {customers.length > 0 && (
        <ul className={styles.pets}>
          {customers.map((c) => (
            <li key={c.id}>
              <Card className={styles.petCard}>
                <div className={styles.petInfo}>
                  <strong className={styles.petName}>{c.full_name}</strong>
                  <span className={`${styles.muted} break-anywhere`}>
                    {[c.whatsapp, c.email].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <Link
                  href={`/admin/citas/nueva?cliente=${c.id}`}
                  className={buttonClassName({ variant: "ghost" })}
                >
                  Elegir<span className="visually-hidden"> a {c.full_name}</span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
