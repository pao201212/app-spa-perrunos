import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Subdominios locales de los spas: {slug}.localhost y admin.localhost.
  allowedDevOrigins: ["*.localhost"],
};

export default nextConfig;
