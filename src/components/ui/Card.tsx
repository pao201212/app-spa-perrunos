import type { HTMLAttributes } from "react";

import styles from "./Card.module.css";
import { cx } from "./cx";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx(styles.card, className)} {...props} />;
}
