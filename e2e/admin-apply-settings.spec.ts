import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  createLocation,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  grantMembership,
  seedLocationConfig,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

// Spa propio por test: "aplicar a todos" afecta a todos los locales del spa y no debe tocar
// los que crean otros tests en paralelo.
let staff: E2EUser;
let slug: string;
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;

test.beforeEach(async ({ context }) => {
  slug = `e2e-aplicar-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Aplicar");
  staff = await createE2EUser("admin-aplicar");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("aplica estaciones y horario de un local a los demás, con confirmación", async ({ page }) => {
  const sourceId = await createLocation(slug, "Sede origen");
  await seedLocationConfig(slug, sourceId);
  const otherId = await createLocation(slug, "Sede destino");

  await page.goto(at(`/admin/locales/${sourceId}`));
  const section = page.getByRole("region", { name: "Aplicar a otros locales" });
  await section.getByLabel(/Ajustes de reserva/).uncheck();
  await section.getByRole("button", { name: "Aplicar a todos los locales" }).click();

  const dialog = page.getByRole("dialog", { name: "¿Aplicar a todos los locales?" });
  await expect(dialog).toContainText("1 local más");
  await dialog.getByRole("button", { name: "Sí, aplicar" }).click();
  await expect(section.getByRole("status")).toHaveText("Configuración aplicada a 1 local");

  await page.goto(at(`/admin/locales/${otherId}`));
  const stations = page.getByRole("region", { name: "Estaciones" });
  await expect(stations.getByLabel("Estaciones de baño")).toHaveValue("2");
  await expect(stations.getByLabel("Estaciones de terminado")).toHaveValue("1");
  const hours = page.getByRole("region", { name: "Horario" });
  await expect(hours.getByRole("listitem").filter({ hasText: "Lunes" })).toContainText(
    "08:00 – 12:30",
  );
});

test("si el spa tiene un solo local, no muestra la opción", async ({ page }) => {
  const onlyId = await createLocation(slug, "Única sede");
  await page.goto(at(`/admin/locales/${onlyId}`));
  await expect(page.getByRole("heading", { level: 1, name: "Única sede" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Aplicar a otros locales" })).toHaveCount(0);
});
