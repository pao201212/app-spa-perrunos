import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { copy } from "@/lib/copy";

import { CustomerNav } from "./CustomerNav";
import styles from "./CustomerShell.module.css";

/** Estructura del área del cliente: logo del spa, navegación y contenido. */
export function CustomerShell({
  businessName,
  children,
}: {
  businessName: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.home} aria-label={`${businessName} · ${copy.nav.home}`}>
          <BrandLogo name={businessName} />
        </Link>
        <CustomerNav />
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
