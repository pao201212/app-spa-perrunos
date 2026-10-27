import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  createLocation,
  createService,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  grantMembership,
  seedBathDurations,
  seedLocationConfig,
  seedSimpleCapacity,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

let staff: E2EUser;
let slug: string;
let locationId: string;
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;

/** Primer lunes al menos 7 días después de hoy (YYYY-MM-DD). */
function nextMonday(offsetDays = 0): string {
  const date = new Date(Date.now() + 7 * 86_400_000);
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

test.beforeEach(async ({ context }) => {
  slug = `e2e-cupo-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Cupo");
  locationId = await createLocation(slug, "Sede cupo");
  await seedLocationConfig(slug, locationId);
  const bath = await createService(slug, "Baño");
  await seedBathDurations(bath, [{ size: "M", coat: "short" }]);
  await seedSimpleCapacity(locationId, bath);
  staff = await createE2EUser("admin-cupo");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("¿Por qué no hay cupo? muestra cada hora con su entrega o su motivo", async ({ page }) => {
  await page.goto(at(`/admin/locales/${locationId}`));
  await page.getByRole("link", { name: /¿Por qué no hay cupo\?/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "¿Por qué no hay cupo?" }),
  ).toBeVisible();

  const form = page.getByRole("region", { name: "Consulta" });
  await form.getByLabel("Día").fill(nextMonday());
  await form.getByLabel("Servicio").selectOption({ label: "Baño" });
  await form.getByRole("button", { name: "Ver horas" }).click();

  const hours = page.getByRole("region", { name: "Horas del día" });
  const items = hours.getByRole("listitem");
  await expect(items.first()).toHaveText(/08:00.*Disponible.*entrega aprox\. 09:30/);
  await expect(items.filter({ hasText: /^11:15/ })).toHaveText(
    /Fuera de horario.*Entregaría 12:45 y el local cierra 12:30/,
  );
  await expect(hours).toContainText("13 disponibles"); // 08:00 a 11:00, cada 15 min

  // La consulta queda en la URL: al recargar se conserva.
  await page.reload();
  await expect(page.getByRole("region", { name: "Consulta" }).getByLabel("Servicio")).toHaveValue(
    /.+/,
  );

  // Otra talla sin capacidad ni precio configurados.
  await page.getByRole("region", { name: "Consulta" }).getByLabel("Talla").selectOption("L");
  await page.getByRole("button", { name: "Ver horas" }).click();
  await expect(
    page.getByRole("region", { name: "Horas del día" }).getByRole("listitem").first(),
  ).toHaveText(/Sin precio/);
});

test("un día sin horario aparece cerrado", async ({ page }) => {
  await page.goto(at(`/admin/locales/${locationId}/disponibilidad?date=${nextMonday(6)}`));
  await page.getByRole("region", { name: "Consulta" }).getByLabel("Servicio").selectOption({
    label: "Baño",
  });
  await page.getByRole("button", { name: "Ver horas" }).click();
  await expect(
    page.getByRole("region", { name: "Horas del día" }).getByRole("listitem"),
  ).toHaveText([/Todo el día.*Cerrado.*El local no abre este día/]);
});

test("no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(at(`/admin/locales/${locationId}/disponibilidad?date=${nextMonday()}`));
  await page.getByLabel("Servicio").selectOption({ label: "Baño" });
  await page.getByRole("button", { name: "Ver horas" }).click();
  await page.getByRole("region", { name: "Horas del día" }).waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
