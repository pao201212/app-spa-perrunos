import { useId, type ReactNode } from "react";

import { Card } from "@/components/ui";

/** Sección con nombre accesible (role="region"), p. ej. "Horario" dentro del detalle de un local. */
export function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <Card>
        <div>
          <h2 id={id}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {children}
      </Card>
    </section>
  );
}
