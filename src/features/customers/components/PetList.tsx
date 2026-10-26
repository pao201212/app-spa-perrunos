import { PawPrint } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui";
import { coatLabel, sizeLabel } from "@/lib/pets/labels";

import type { OwnPet } from "../queries";
import styles from "./customers.module.css";

/** `editHref` arma el enlace de edición (área del cliente o panel del spa). */
export function PetList({
  pets,
  editHref,
}: {
  pets: OwnPet[];
  editHref: (petId: string) => string;
}) {
  return (
    <ul className={styles.pets}>
      {pets.map((pet) => (
        <li key={pet.id}>
          <Card className={styles.petCard}>
            {pet.photoUrl ? (
              // URL firmada de Storage privado: next/image no puede optimizarla sin configurar el dominio.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pet.photoUrl} alt={`Foto de ${pet.name}`} className={styles.photo} />
            ) : (
              <span className={styles.photoPlaceholder} aria-hidden="true">
                <PawPrint />
              </span>
            )}
            <div className={styles.petInfo}>
              <strong className={styles.petName}>{pet.name}</strong>
              <span className={styles.muted}>
                {pet.tenant_breeds.name} · {sizeLabel[pet.size]} · {coatLabel[pet.coat]}
                {pet.size_locked && " · fijada"}
              </span>
            </div>
            <Link href={editHref(pet.id)} className={styles.edit}>
              Editar<span className="visually-hidden"> {pet.name}</span>
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  );
}
