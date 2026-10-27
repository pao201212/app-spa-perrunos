import type { HTMLAttributes } from "react";

import styles from "./Badge.module.css";
import { cx } from "./cx";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return <span className={cx(styles.badge, styles[tone], className)} {...props} />;
}
