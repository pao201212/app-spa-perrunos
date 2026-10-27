import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { openAdminSection } from "./support/admin-nav";
import {
  createCustomerWithPets,
  createE2EUser,
  createLocation,
  createService,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  grantMembership,
  seedBathAppointment,
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
function nextMonday(): string {
  const date = new Date(Date.now() + 7 * 86_400_000);
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

test.beforeEach(async ({ context }) => {
  slug = `e2e-ocupacion-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Ocupación");
  locationId = await createLocation(slug, "Sede ocupación");
  await seedLocationConfig(slug, locationId); // abre solo los lunes 08:00-12:30
  await seedSimpleCapacity(locationId, await createService(slug, "Baño")); // 1 bañadora el lunes
  staff = await createE2EUser("admin-ocupacion");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("el calendario muestra la ocupación del día y las mascotas por talla", async ({ page }) => {
  const monday = nextMonday();
  const customerId = await createCustomerWithPets(slug, "Cliente ocupación", [
    "Max",
    "Lola",
    "Pepa",
  ]);
  await seedBathAppointment(
    locationId,
    customerId,
    `${monday}T08:00:00-05:00`,
    `${monday}T09:30:00-05:00`,
  );

  await page.goto(at("/admin"));
  await openAdminSection(page, "Ocupación");
  await expect(page.getByRole("heading", { level: 1, name: "Ocupación" })).toBeVisible();
  await page.goto(at(`/admin/ocupacion?local=${locationId}&mes=${monday.slice(0, 7)}`));

  const calendar = page.getByRole("list", { name: /^Ocupación de / });
  const cell = calendar
    .getByRole("listitem")
    .filter({ has: page.locator(`time[datetime="${monday}"]`) });
  await expect(cell).toContainText("50 %");
  await expect(cell).toContainText("½ de 1 jornada");
  await expect(cell).toContainText("3 M");
  await expect(calendar.getByRole("listitem").filter({ hasText: "Cerrado" }).first()).toBeVisible();

  await cell.getByRole("link", { name: /Ver horas/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "¿Por qué no hay cupo?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Día")).toHaveValue(monday);
});

test("navega entre meses", async ({ page }) => {
  await page.goto(at(`/admin/ocupacion?local=${locationId}&mes=2026-12`));
  await expect(page.getByRole("heading", { level: 2, name: "diciembre de 2026" })).toBeVisible();
  await page.getByRole("link", { name: /enero de 2027/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "enero de 2027" })).toBeVisible();
});

test("no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(at(`/admin/ocupacion?local=${locationId}`));
  await page.locator("h1").waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
