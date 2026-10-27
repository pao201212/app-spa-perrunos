import type { Metadata } from "next";
import { Suspense } from "react";

import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { Card } from "@/components/ui";
import { BreedForm } from "@/features/breeds/components/BreedForm";
import { requireSuperAdmin } from "@/lib/auth/guards";

import styles from "../../platform.module.css";

export const metadata: Metadata = { title: "Nueva raza" };

export default function NewBreedPage() {
  return (
    <Suspense fallback={null}>
      <NewBreedContent />
    </Suspense>
  );
}

async function NewBreedContent() {
  await requireSuperAdmin("/razas/nueva");
  return (
    <>
      <PlatformHeader />
      <main className={`container ${styles.page} ${styles.narrow}`}>
        <h1>Nueva raza</h1>
        <Card>
          <BreedForm />
        </Card>
      </main>
    </>
  );
}
