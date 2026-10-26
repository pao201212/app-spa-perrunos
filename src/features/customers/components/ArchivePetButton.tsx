"use client";

import { useState } from "react";

import { Button, Dialog } from "@/components/ui";

import { archivePetAction } from "../actions";

export function ArchivePetButton({
  slug,
  petId,
  petName,
}: {
  slug: string;
  petId: string;
  petName: string;
}) {
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
            <form action={archivePetAction.bind(null, slug, petId)}>
              <Button type="submit" variant="danger">
                Quitar
              </Button>
            </form>
          </>
        }
      >
        <p>Dejará de aparecer en tu lista. El spa conserva su historial de citas.</p>
      </Dialog>
    </>
  );
}
