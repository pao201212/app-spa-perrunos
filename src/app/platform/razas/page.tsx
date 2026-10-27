import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { buttonClassName } from "@/components/ui";
import { BreedCatalog } from "@/features/breeds/components/BreedCatalog";
import { listGlobalBreeds } from "@/features/breeds/queries";
import { requireSuperAdmin } from "@/lib/auth/guards";

import styles from "../platform.module.css";

export const metadata: Metadata = { title: "Catálogo de razas" };

export default function BreedsPage() {
  return (
    <Suspense fallback={null}>
      <BreedsContent />
    </Suspense>
  );
}

async function BreedsContent() {
  await requireSuperAdmin("/razas");
  const breeds = await listGlobalBreeds();

  return (
    <>
      <PlatformHeader />
      <main className={`container ${styles.page}`}>
        <div className={styles.titleRow}>
          <h1>Catálogo de razas</h1>
          <Link href="/razas/nueva" className={buttonClassName()}>
            Nueva raza
          </Link>
        </div>
        <p className={styles.muted}>
          Catálogo base de Prisma Lab. Cada spa lo hereda y puede ajustar talla y pelo de sus razas.
        </p>
        <BreedCatalog breeds={breeds} />
      </main>
    </>
  );
}
