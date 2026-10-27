import type { NextRequest } from "next/server";

import { handleAuthCallback } from "@/lib/auth/callback-handler";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/s/[slug]/auth/callback">,
) {
  const { slug } = await params;
  return handleAuthCallback(request, { kind: "tenant", slug });
}
