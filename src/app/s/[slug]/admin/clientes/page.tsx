import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, Button, buttonClassName, Card, Input } from "@/components/ui";
import { searchCustomers } from "@/features/customers/admin-queries";
import styles from "@/features/customers/components/customers.module.css";
import { requireTenantStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Clientes" };

export default function CustomersPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]/admin/clientes">) {
  return (
    <Suspense fallback={null}>
      {Promise.all([params, searchParams]).then(([{ slug }, query]) => (
        <CustomersContent slug={slug} query={typeof query.q === "string" ? query.q : ""} />
      ))}
    </Suspense>
  );
}

async function CustomersContent({ slug, query }: { slug: string; query: string }) {
  const { tenant } = await requireTenantStaff(slug, "/admin/clientes");
  const customers = await searchCustomers(tenant.id, query);

  return (
    <AdminShell businessName={tenant.name}>
      <div className={styles.titleRow}>
        <h1>Clientes</h1>
        <Link href="/admin/clientes/nuevo" className={buttonClassName()}>
          Inscribir cliente
        </Link>
      </div>
      <form role="search" className={styles.search}>
        <Input
          label="Buscar cliente"
          name="q"
          type="search"
          placeholder="Nombre, WhatsApp o correo"
          defaultValue={query}
        />
        <Button type="submit" variant="ghost">
          Buscar
        </Button>
      </form>
      {customers.length === 0 ? (
        <Card>
          <p>
            {query ? "No encontramos clientes con esa búsqueda." : "Aún no hay clientes inscritos."}
          </p>
        </Card>
      ) : (
        <ul className={styles.pets}>
          {customers.map((customer) => (
            <li key={customer.id}>
              <Card className={styles.petCard}>
                <div className={styles.petInfo}>
                  <Link href={`/admin/clientes/${customer.id}`} className={styles.petName}>
                    {customer.full_name}
                  </Link>
                  <span className={styles.muted}>
                    {[customer.whatsapp, customer.email].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span className={styles.badges}>
                  <Badge tone="neutral">
                    {customer.petCount} {customer.petCount === 1 ? "mascota" : "mascotas"}
                  </Badge>
                  {!customer.user_id && <Badge tone="warning">Sin cuenta</Badge>}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
