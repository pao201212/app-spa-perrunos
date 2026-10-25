import Link from "next/link";
import { Suspense } from "react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { buttonClassName } from "@/components/ui";
import { copy } from "@/lib/copy";
import { getTenant } from "@/lib/tenancy/get-tenant";

import styles from "./page.module.css";

export default function TenantHome({ params }: PageProps<"/s/[slug]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ slug }) => (
        <Landing slug={slug} />
      ))}
    </Suspense>
  );
}

async function Landing({ slug }: { slug: string }) {
  const tenant = await getTenant(slug);

  return (
    <>
      <SiteHeader businessName={tenant.name} />
      <main className={`container ${styles.hero}`}>
        <div className={styles.copy}>
          <p className={styles.tagline}>{copy.landing.tagline}</p>
          <h1 className={styles.title}>{tenant.name}</h1>
          <p className={styles.description}>{copy.landing.description}</p>
          <div className={styles.actions}>
            <Link href="/reservar" className={buttonClassName({ size: "lg" })}>
              {copy.landing.bookCta}
            </Link>
            <Link href="/servicios" className={buttonClassName({ variant: "ghost", size: "lg" })}>
              {copy.landing.servicesCta}
            </Link>
          </div>
        </div>
        <div className={styles.illustration} aria-hidden="true" />
      </main>
    </>
  );
}
