"use client";

import { useState } from "react";

import { Button, Dialog } from "@/components/ui";

import { deleteBreedAction } from "../actions";
import styles from "./breeds.module.css";

export function DeleteBreedButton({ breedId, breedName }: { breedId: string; breedName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.dangerZone}>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Eliminar raza
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`¿Eliminar ${breedName}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <form action={deleteBreedAction.bind(null, breedId)}>
              <Button type="submit" variant="danger">
                Eliminar
              </Button>
            </form>
          </>
        }
      >
        <p>Los spas que usan esta raza la conservarán como raza propia si ya la ajustaron.</p>
      </Dialog>
    </div>
  );
}
