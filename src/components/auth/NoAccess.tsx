import Link from "next/link";
import { Suspense } from "react";

import { buttonClassName, Card } from "@/components/ui";
import { getViewer } from "@/lib/auth/viewer";
import { copy } from "@/lib/copy";

import styles from "./LoginPanel.module.css";
import { SignOutButton } from "./SignOutButton";

export function NoAccess() {
  return (
    <main className={`container ${styles.page}`}>
      <Card className={styles.card}>
        <h1>{copy.auth.noAccessTitle}</h1>
        <p className={styles.intro}>{copy.auth.noAccessBody}</p>
        <Link href="/" className={buttonClassName({ fullWidth: true })}>
          {copy.auth.backHome}
        </Link>
        <Suspense fallback={null}>
          <SignOutIfSignedIn />
        </Suspense>
      </Card>
    </main>
  );
}

async function SignOutIfSignedIn() {
  const viewer = await getViewer();
  return viewer ? <SignOutButton /> : null;
}
