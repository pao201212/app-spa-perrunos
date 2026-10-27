import type { Metadata } from "next";
import { Suspense } from "react";

import { getTenant } from "@/lib/tenancy/get-tenant";
import { tenantFaviconHref } from "@/lib/theming/paths";
import { ThemeStylesheet } from "@/lib/theming/theme-stylesheet";

export async function generateMetadata({ params }: LayoutProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant(slug);
  return {
    title: { default: tenant.name, template: `%s · ${tenant.name}` },
    icons: { icon: tenantFaviconHref(slug) },
  };
}

export default function TenantLayout({ children, params }: LayoutProps<"/s/[slug]">) {
  return (
    <>
      <Suspense fallback={null}>
        {params.then(({ slug }) => (
          <ThemeStylesheet slug={slug} />
        ))}
      </Suspense>
      {children}
    </>
  );
}
