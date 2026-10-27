import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts", "./tests/setup-server.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // SPEC §9: 90 % en capacity y booking (la reserva incluye las citas y la agenda).
      thresholds: {
        // Global (decidido con Prisma Lab el 2026-10-26; el SPEC pedía 70 %).
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
        "src/features/{capacity,booking,appointments}/**": {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
