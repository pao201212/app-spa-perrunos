import type { NextRequest } from "next/server";

import { handleAuthCallback } from "@/lib/auth/callback-handler";

export function GET(request: NextRequest) {
  return handleAuthCallback(request, { kind: "platform" });
}
