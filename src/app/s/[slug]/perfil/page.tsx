import type { Metadata } from "next";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { Card } from "@/components/ui";
import { ProfileForm } from "@/features/customers/components/ProfileForm";
import { getOwnCustomer, PROFILE_PATH } from "@/lib/auth/customer";
import { requireViewer } from "@/lib/auth/guards";
import { safeNextPath } from "@/lib/auth/redirect";
import { getTenant } from "@/lib/tenancy/get-tenant";

export const metadata: Metadata = { title: "Mi perfil" };

export default function ProfilePage({ params, searchParams }: PageProps<"/s/[slug]/perfil">) {
  return (
    <Suspense fallback={null}>
      {Promise.all([params, searchParams]).then(([{ slug }, query]) => (
        <ProfileContent slug={slug} next={typeof query.next === "string" ? query.next : null} />
      ))}
    </Suspense>
  );
}

async function ProfileContent({ slug, next }: { slug: string; next: string | null }) {
  const safeNext = next ? safeNextPath(next) : null;
  const viewer = await requireViewer(
    safeNext ? `${PROFILE_PATH}?next=${encodeURIComponent(safeNext)}` : PROFILE_PATH,
  );
  const tenant = await getTenant(slug);
  const customer = await getOwnCustomer(tenant.id, viewer.userId);

  return (
    <CustomerShell businessName={tenant.name}>
      <h1>{customer ? "Mi perfil" : "Completa tu perfil"}</h1>
      {!customer && <p>Antes de continuar, cuéntanos cómo contactarte.</p>}
      <Card>
        <p className="break-anywhere">
          Correo: <strong>{viewer.email}</strong>
        </p>
        <ProfileForm
          slug={slug}
          next={safeNext}
          defaults={{
            full_name: customer?.full_name ?? viewer.name ?? "",
            whatsapp: customer?.whatsapp ?? "",
          }}
        />
      </Card>
      <SignOutButton />
    </CustomerShell>
  );
}
