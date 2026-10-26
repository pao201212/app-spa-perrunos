"use client";

import { useState } from "react";

import { Button, Dialog } from "@/components/ui";

type Props = {
  /** Server Action ya enlazada (cliente o staff). */
  action: () => Promise<void>;
  petName: string;
};

export function ArchivePetButton({ action, petName }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Quitar mascota
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`¿Quitar a ${petName}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <form action={action}>
              <Button type="submit" variant="danger">
                Quitar
              </Button>
            </form>
          </>
        }
      >
        <p>Dejará de aparecer en la lista. El spa conserva su historial de citas.</p>
      </Dialog>
    </>
  );
}
