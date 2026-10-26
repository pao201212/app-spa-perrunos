"use client";

import {
  Contact,
  Home,
  MapPin,
  MoreHorizontal,
  PawPrint,
  Scissors,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Sheet } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { copy } from "@/lib/copy";

import styles from "./AdminShell.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** En móvil va en la barra inferior; los demás quedan en "Más". */
  primary?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: copy.admin.nav.home, icon: Home, exact: true, primary: true },
  { href: "/admin/clientes", label: copy.admin.nav.customers, icon: Contact, primary: true },
  { href: "/admin/servicios", label: copy.admin.nav.services, icon: Scissors, primary: true },
  { href: "/admin/locales", label: copy.admin.nav.locations, icon: MapPin },
  { href: "/admin/personal", label: copy.admin.nav.staff, icon: Users },
  { href: "/admin/razas", label: copy.admin.nav.breeds, icon: PawPrint },
];

const isActive = (pathname: string, { href, exact }: NavItem) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/**
 * Móvil: barra inferior con las secciones principales y "Más" para el resto (máx. 4 botones).
 * Desde 1024px: barra lateral con todas las secciones.
 */
export function AdminNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const secondary = ITEMS.filter((item) => !item.primary);
  const secondaryActive = secondary.some((item) => isActive(pathname, item));

  return (
    <nav aria-label={copy.admin.navLabel} className={styles.nav}>
      <ul className={styles.navList}>
        {ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className={item.primary ? undefined : styles.desktopOnly}>
              <Link
                href={item.href}
                className={cx(styles.navLink, active && styles.navActive)}
                aria-current={active ? "page" : undefined}
              >
                <Icon aria-hidden="true" className={styles.navIcon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className={styles.mobileOnly}>
          <button
            type="button"
            className={cx(styles.navLink, styles.navButton, secondaryActive && styles.navActive)}
            onClick={() => setMoreOpen(true)}
          >
            <MoreHorizontal aria-hidden="true" className={styles.navIcon} />
            <span>{copy.admin.nav.more}</span>
          </button>
        </li>
      </ul>
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={copy.admin.nav.more}>
        <ul className={styles.moreList}>
          {secondary.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={styles.moreLink}
                  onClick={() => setMoreOpen(false)}
                >
                  <Icon aria-hidden="true" className={styles.navIcon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </nav>
  );
}
