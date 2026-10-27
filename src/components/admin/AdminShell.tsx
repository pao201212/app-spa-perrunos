import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { BrandLogo } from "@/components/brand/BrandLogo";

import { AdminNav } from "./AdminNav";
import styles from "./AdminShell.module.css";

/** Estructura del panel del spa: encabezado, navegación y contenido. */
export function AdminShell({
  businessName,
  children,
}: {
  businessName: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <BrandLogo name={businessName} className={styles.logo} />
        <span className={styles.badge}>Panel</span>
        <SignOutButton />
      </header>
      <AdminNav />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
