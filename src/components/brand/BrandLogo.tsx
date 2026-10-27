import { cx } from "@/components/ui/cx";

import styles from "./BrandLogo.module.css";

export type BrandLogoProps = {
  /** Nombre del negocio: texto alternativo del logo. */
  name: string;
  /** Usa la versión del logo para fondos oscuros. */
  onDark?: boolean;
  className?: string;
};

/** Logo del tenant. La imagen sale del tema (--brand-logo), no del código. */
export function BrandLogo({ name, onDark = false, className }: BrandLogoProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cx(styles.logo, onDark && styles.onDark, className)}
    />
  );
}
