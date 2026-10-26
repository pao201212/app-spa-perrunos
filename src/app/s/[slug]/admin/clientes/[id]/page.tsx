import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, buttonClassName, Card } from "@/components/ui";
import { updateCustomerAction } from "@/features/customers/admin-actions";
import {
  getCustomerForStaff,
  listCustomerPetGroups,
  listCustomerPets,
} from "@/features/customers/admin-queries";
import { CustomerAdminForm } from "@/features/customers/components/CustomerAdminForm";
import styles from "@/features/customers/components/customers.module.css";
import { PetGroupsEditor } from "@/features/customers/components/PetGroupsEditor";
import { PetList } from "@/features/customers/components/PetList";
import { requireTenantStaff } from "@/lib/auth/guards";

export default function CustomerDetailPage({ params }: PageProps<"/s/[slug]/admin/clientes/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug, id }) => (
        <CustomerDetailContent slug={slug} id={id} />
      ))}
    </Suspense>
  );
}

async function CustomerDetailContent({ slug, id }: { slug: string; id: string }) {
  const { tenant } = await requireTenantStaff(slug, `/admin/clientes/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const customer = await getCustomerForStaff(tenant.id, id);
  if (!customer) notFound();
  const [pets, groups] = await Promise.all([
    listCustomerPets(customer.id),
    listCustomerPetGroups(customer.id),
  ]);

  return (
    <AdminShell businessName={tenant.name}>
      <div className={styles.titleRow}>
        <h1>{customer.full_name}</h1>
        <Link href={`/admin/citas/nueva?cliente=${customer.id}`} className={buttonClassName()}>
          Crear cita
        </Link>
      </div>
      <div>
        {customer.user_id ? (
          <Badge tone="success">Con cuenta</Badge>
        ) : (
          <p className={styles.muted}>
            <Badge tone="warning">Sin cuenta</Badge>{" "}
            {customer.email
              ? `Se vinculará cuando ingrese con ${customer.email}.`
              : "Agrega su correo para que pueda ingresar y ver sus citas."}
          </p>
        )}
      </div>
      <AdminSection title="Datos">
        <CustomerAdminForm
          action={updateCustomerAction.bind(null, slug, customer.id)}
          customer={customer}
        />
      </AdminSection>
      <AdminSection title="Mascotas">
        {pets.length === 0 ? (
          <Card>
            <p>Este cliente no tiene mascotas registradas.</p>
          </Card>
        ) : (
          <PetList
            pets={pets}
            editHref={(petId) => `/admin/clientes/${customer.id}/mascotas/${petId}`}
          />
        )}
        <Link
          href={`/admin/clientes/${customer.id}/mascotas/nueva`}
          className={buttonClassName({ variant: "ghost" })}
        >
          Agregar mascota
        </Link>
      </AdminSection>
      <AdminSection
        title="Se bañan juntas"
        description="Hermanas que entran a la vez a la tina; cada una usa su propia mesa de secado."
      >
        <PetGroupsEditor
          slug={slug}
          customerId={customer.id}
          groups={groups}
          pets={pets.map(({ id, name }) => ({ id, name }))}
        />
      </AdminSection>
    </AdminShell>
  );
}
