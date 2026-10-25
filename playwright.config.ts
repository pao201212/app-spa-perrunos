import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Credenciales de Supabase local para crear usuarios de prueba (e2e/support/auth.ts).
loadEnvConfig(process.cwd());

const PORT = 3000;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    // Los spas se resuelven por subdominio; Chromium resuelve *.localhost a 127.0.0.1.
    baseURL: `http://demo.localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    // Por defecto se prueba el build de producción (lo que se despliega). E2E_DEV=1 usa `next dev`
    // para iterar rápido; en dev, React tiene un error intermitente de Performance.measure al prefetchear.
    command: process.env.E2E_DEV
      ? `npm run dev -- -p ${PORT}`
      : `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 300_000,
  },
});
