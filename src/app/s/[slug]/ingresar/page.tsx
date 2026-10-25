import type { Metadata } from "next";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.auth.title };

export default function TenantLogin({ searchParams }: PageProps<"/s/[slug]/ingresar">) {
  return <LoginPanel searchParams={searchParams} />;
}
