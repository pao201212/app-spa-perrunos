"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { callbackUrl } from "@/lib/auth/redirect";
import { copy } from "@/lib/copy";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function signIn() {
    setPending(true);
    setError(false);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(window.location.origin, next) },
    });
    // Si todo va bien, el navegador ya está saliendo hacia Google.
    if (error) {
      setPending(false);
      setError(true);
    }
  }

  return (
    <>
      <Button size="lg" fullWidth loading={pending} onClick={signIn}>
        {pending ? copy.auth.redirecting : copy.auth.google}
      </Button>
      {error && <p role="alert">{copy.auth.unexpectedError}</p>}
    </>
  );
}
