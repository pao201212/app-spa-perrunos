import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los E2E compilan en otra carpeta: compartir .next con `next dev` le corrompe el HMR.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // Subdominios locales de los spas: {slug}.localhost y admin.localhost.
  allowedDevOrigins: ["*.localhost"],
};

export default nextConfig;
