import type { Metadata } from "next";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.auth.title };

export default function PlatformLogin({ searchParams }: PageProps<"/platform/ingresar">) {
  return <LoginPanel searchParams={searchParams} />;
}
