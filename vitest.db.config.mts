import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Tests contra Supabase local (`npm run db:start`): RLS, capacidad y concurrencia.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    // Comparten una sola base de datos: se ejecutan en serie.
    fileParallelism: false,
    passWithNoTests: true,
    testTimeout: 30_000,
  },
});
