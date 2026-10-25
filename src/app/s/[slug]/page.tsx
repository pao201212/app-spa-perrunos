import { Suspense } from "react";

import { getTenant } from "@/lib/tenancy/get-tenant";

export default function TenantHome({ params }: PageProps<"/s/[slug]">) {
  return (
    <main>
      <Suspense fallback={null}>
        {params.then(({ slug }) => (
          <TenantTitle slug={slug} />
        ))}
      </Suspense>
    </main>
  );
}

async function TenantTitle({ slug }: { slug: string }) {
  const tenant = await getTenant(slug);
  return <h1>{tenant.name}</h1>;
}
