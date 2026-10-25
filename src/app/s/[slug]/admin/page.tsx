import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { requireTenantStaff } from "@/lib/auth/guards";
import { ADMIN_PATH } from "@/lib/auth/roles";
import { copy } from "@/lib/copy";

export default function AdminHome({ params }: PageProps<"/s/[slug]/admin">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <AdminHomeContent slug={slug} />
      ))}
    </Suspense>
  );
}

async function AdminHomeContent({ slug }: { slug: string }) {
  const { tenant } = await requireTenantStaff(slug, ADMIN_PATH);
  return (
    <main className="container">
      <h1>{copy.admin.panelTitle(tenant.name)}</h1>
      <SignOutButton />
    </main>
  );
}
