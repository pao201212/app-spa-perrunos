"use client";

import { Home, MapPin, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui/cx";
import { copy } from "@/lib/copy";

import styles from "./AdminShell.module.css";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const ITEMS: NavItem[] = [
  { href: "/admin", label: copy.admin.nav.home, icon: Home, exact: true },
  { href: "/admin/locales", label: copy.admin.nav.locations, icon: MapPin },
];

/** Barra inferior en móvil (al alcance del pulgar) y lateral desde 1024px. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label={copy.admin.navLabel} className={styles.nav}>
      <ul className={styles.navList}>
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
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
