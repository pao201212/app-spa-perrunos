import { Suspense } from "react";

import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { copy } from "@/lib/copy";

import { GoogleSignInButton } from "./GoogleSignInButton";
import styles from "./LoginPanel.module.css";
import { SignOutButton } from "./SignOutButton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Pantalla de ingreso compartida por los spas y la consola. */
export function LoginPanel({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className={`container ${styles.page}`}>
      <Card className={styles.card}>
        <h1>{copy.auth.title}</h1>
        <Suspense fallback={null}>
          {searchParams.then((params) => (
            <LoginContent next={first(params.next)} failed={first(params.error) === "auth"} />
          ))}
        </Suspense>
      </Card>
    </main>
  );
}

async function LoginContent({ next, failed }: { next?: string; failed: boolean }) {
  const user = await getCurrentUser();
  if (user) {
    return (
      <>
        <p>
          {copy.auth.signedInAs} <strong>{user.email}</strong>
        </p>
        <SignOutButton />
      </>
    );
  }
  return (
    <>
      <p className={styles.intro}>{copy.auth.intro}</p>
      {failed && (
        <p role="alert" className={styles.error}>
          {copy.auth.error}
        </p>
      )}
      <GoogleSignInButton next={next} />
    </>
  );
}
