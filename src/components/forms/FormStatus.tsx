import type { FormState } from "./form-state";
import styles from "./forms.module.css";

/** Mensaje general del formulario, anunciado a lectores de pantalla (role="status"). */
export function FormStatus({ state }: { state: FormState }) {
  return (
    <p role="status" className={state.status === "error" ? styles.error : styles.success}>
      {state.message}
    </p>
  );
}
