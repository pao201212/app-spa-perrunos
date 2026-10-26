"use client";

import { useState } from "react";

import { Button, Dialog } from "@/components/ui";

import { deleteOwnBreedAction, resetTenantBreedAction } from "../actions";
import type { TenantBreed } from "../queries";
import styles from "./pet-catalog.module.css";

/** Restaurar (raza heredada y ajustada) o eliminar (raza propia). */
export function BreedDangerZone({ slug, breed }: { slug: string; breed: TenantBreed }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inherited = breed.global_breed_id !== null;

  if (inherited) {
    if (!breed.is_customized) return null;
    return (
      <form
        action={resetTenantBreedAction.bind(null, slug, breed.id)}
        className={styles.dangerZone}
      >
        <Button type="submit" variant="ghost">
          Restaurar valores del catálogo
        </Button>
      </form>
    );
  }

  return (
    <div className={styles.dangerZone}>
      <Button variant="danger" onClick={() => setConfirmDelete(true)}>
        Eliminar raza
      </Button>
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`¿Eliminar ${breed.name}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <form action={deleteOwnBreedAction.bind(null, slug, breed.id)}>
              <Button type="submit" variant="danger">
                Eliminar
              </Button>
            </form>
          </>
        }
      >
        <p>Esta raza propia dejará de aparecer para el spa y sus clientes.</p>
      </Dialog>
    </div>
  );
}
