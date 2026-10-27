import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { Card } from "@/components/ui";
import { BreedForm } from "@/features/breeds/components/BreedForm";
import { DeleteBreedButton } from "@/features/breeds/components/DeleteBreedButton";
import { getGlobalBreed } from "@/features/breeds/queries";
import { requireSuperAdmin } from "@/lib/auth/guards";

import styles from "../../platform.module.css";

export default function EditBreedPage({ params }: PageProps<"/platform/razas/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => (
        <EditBreedContent id={id} />
      ))}
    </Suspense>
  );
}

async function EditBreedContent({ id }: { id: string }) {
  await requireSuperAdmin(`/razas/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const breed = await getGlobalBreed(id);
  if (!breed) notFound();

  return (
    <>
      <PlatformHeader />
      <main className={`container ${styles.page} ${styles.narrow}`}>
        <h1>{breed.name}</h1>
        <Card>
          <BreedForm breed={breed} />
        </Card>
        <DeleteBreedButton breedId={breed.id} breedName={breed.name} />
      </main>
    </>
  );
}
