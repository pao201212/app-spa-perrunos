import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { copy } from "@/lib/copy";

export default function PlatformHome() {
  return (
    <Suspense fallback={null}>
      <PlatformHomeContent />
    </Suspense>
  );
}

async function PlatformHomeContent() {
  await requireSuperAdmin("/");
  return (
    <main className="container">
      <h1>{copy.platform.title}</h1>
      <SignOutButton />
    </main>
  );
}
