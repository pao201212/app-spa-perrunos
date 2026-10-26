import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { copy } from "@/lib/copy";

import styles from "./SiteHeader.module.css";

export function PlatformHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link
          href="/"
          className={styles.home}
          aria-label={`${copy.platform.title} · ${copy.nav.home}`}
        >
          <BrandLogo name="Prisma Lab" />
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
