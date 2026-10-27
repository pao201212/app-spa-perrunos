import Link from "next/link";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { copy } from "@/lib/copy";

import styles from "./SiteHeader.module.css";

export function SiteHeader({ businessName }: { businessName: string }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.home} aria-label={`${businessName} · ${copy.nav.home}`}>
          <BrandLogo name={businessName} />
        </Link>
      </div>
    </header>
  );
}
