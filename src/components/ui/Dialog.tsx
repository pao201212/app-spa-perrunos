"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cx } from "./cx";
import styles from "./Dialog.module.css";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "sheet": panel inferior en móvil, centrado desde 768px. */
  variant?: "dialog" | "sheet";
};

/** Modal sobre <dialog> nativo: foco atrapado, Escape y fondo inerte los da el navegador. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "dialog",
}: DialogProps) {
  if (!open) return null;
  return (
    <OpenDialog onClose={onClose} title={title} footer={footer} variant={variant}>
      {children}
    </OpenDialog>
  );
}

export function Sheet(props: Omit<DialogProps, "variant">) {
  return <Dialog {...props} variant="sheet" />;
}

function OpenDialog({ onClose, title, children, footer, variant }: Omit<DialogProps, "open">) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx(styles.dialog, variant === "sheet" && styles.sheet)}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button type="button" className={styles.close} onClick={() => ref.current?.close()}>
          <X aria-hidden="true" />
          <span className="visually-hidden">Cerrar</span>
        </button>
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </dialog>
  );
}
