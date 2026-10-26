"use client";

import { PawPrint, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui/cx";
import { copy } from "@/lib/copy";

import styles from "./CustomerShell.module.css";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/mascotas", label: copy.customer.nav.pets, icon: PawPrint },
  { href: "/perfil", label: copy.customer.nav.profile, icon: UserRound },
];

/** Barra inferior en móvil; enlaces en el encabezado desde 768px. */
export function CustomerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label={copy.customer.navLabel} className={styles.nav}>
      <ul className={styles.navList}>
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cx(styles.navLink, active && styles.navActive)}
                aria-current={active ? "page" : undefined}
              >
                <Icon aria-hidden="true" className={styles.navIcon} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
