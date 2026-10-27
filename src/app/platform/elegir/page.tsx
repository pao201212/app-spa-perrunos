import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import styles from "@/components/auth/LoginPanel.module.css";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { buttonClassName, Card } from "@/components/ui";
import { requireViewer } from "@/lib/auth/guards";
import { requestOrigin } from "@/lib/auth/origin";
import { ADMIN_PATH, CHOOSE_TENANT_PATH, NO_ACCESS_PATH, tenantOrigin } from "@/lib/auth/roles";
import { copy } from "@/lib/copy";

export default function ChooseTenant() {
  return (
    <Suspense fallback={null}>
      <ChooseTenantContent />
    </Suspense>
  );
}

async function ChooseTenantContent() {
  const viewer = await requireViewer(CHOOSE_TENANT_PATH);
  if (viewer.tenants.length === 0) redirect(NO_ACCESS_PATH);
  const origin = requestOrigin(await headers());

  return (
    <main className={`container ${styles.page}`}>
      <Card className={styles.card}>
        <h1>{copy.auth.chooseTitle}</h1>
        {viewer.tenants.map((tenant) => (
          <a
            key={tenant.slug}
            href={`${tenantOrigin(origin, tenant.slug)}${ADMIN_PATH}`}
            className={buttonClassName({ variant: "ghost", fullWidth: true })}
          >
            {tenant.name}
          </a>
        ))}
        <SignOutButton />
      </Card>
    </main>
  );
}
