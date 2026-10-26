import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { openAdminSection } from "./support/admin-nav";
import {
  createCustomerWithPets,
  createE2EUser,
  createLocation,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  grantMembership,
  seedBathAppointment,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

let staff: E2EUser;
let slug: string;
let locationId: string;
const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;
const agenda = () => at(`/admin/agenda?local=${locationId}&fecha=${day}`);

test.beforeEach(async ({ context }) => {
  slug = `e2e-agenda-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Agenda");
  locationId = await createLocation(slug, "Sede agenda");
  const customerId = await createCustomerWithPets(slug, "Lucía Gómez", ["Rocky"]);
  await seedBathAppointment(
    locationId,
    customerId,
    `${day}T08:00:00-05:00`,
    `${day}T09:30:00-05:00`,
  );
  staff = await createE2EUser("admin-agenda");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("la cita avanza de estado desde la agenda del día", async ({ page }) => {
  await page.goto(at("/admin"));
  await openAdminSection(page, "Agenda");
  await expect(page.getByRole("heading", { level: 1, name: "Agenda" })).toBeVisible();
  await page.goto(agenda());

  const dayView = page.getByRole("region", { name: /\d{4}$/ });
  const card = dayView.getByRole("listitem").filter({ hasText: "Rocky" });
  await expect(card).toContainText("08:00 → 09:30");
  await expect(card).toContainText("Agendada");
  await expect(card).toContainText("Lucía Gómez");

  for (const [button, status] of [
    ["Recibir", "Recibida"],
    ["Empezar", "Atendiendo"],
    ["Marcar lista", "Lista para recoger"],
    ["Entregar", "Entregada"],
  ]) {
    await card.getByRole("button", { name: `${button} la cita de las 08:00` }).click();
    await expect(card).toContainText(status);
  }
  await expect(card.getByRole("button")).toHaveCount(0);
});

test("ajusta la hora de entrega y no permite una anterior a la llegada", async ({ page }) => {
  await page.goto(agenda());
  const card = page
    .getByRole("region", { name: /\d{4}$/ })
    .getByRole("listitem")
    .filter({ hasText: "Rocky" });
  await card.getByRole("button", { name: "Ajustar entrega de la cita de las 08:00" }).click();
  await card.getByLabel("Nueva hora de entrega").fill("07:00");
  await card.getByRole("button", { name: "Guardar entrega" }).click();
  await expect(card.getByText("Debe ser después de la llegada")).toBeVisible();

  await card.getByLabel("Nueva hora de entrega").fill("10:15");
  await card.getByRole("button", { name: "Guardar entrega" }).click();
  await expect(card).toContainText("08:00 → 10:15");
});

test("en escritorio se ve la semana y se elige otro día", async ({ page, isMobile }) => {
  test.skip(isMobile, "la semana completa es solo para escritorio");
  await page.goto(agenda());
  const week = page.getByRole("list", { name: "Semana" });
  await expect(
    week.getByRole("list").getByRole("listitem").filter({ hasText: "Rocky" }),
  ).toContainText("08:00");
  await expect(week.locator('[aria-current="date"]')).toBeVisible();
  await week.locator('a:not([aria-current="date"])').first().click();
  await expect(page.getByText("No hay citas este día.")).toBeVisible();
});

test("en móvil se navega día por día", async ({ page, isMobile }) => {
  test.skip(!isMobile, "la navegación por día es la vista móvil");
  await page.goto(agenda());
  await expect(page.getByRole("list", { name: "Semana" })).toBeHidden();
  await page.getByRole("navigation", { name: "Días" }).getByRole("link").last().click();
  await expect(page.getByText("No hay citas este día.")).toBeVisible();
});

test("la agenda no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(agenda());
  await page.locator("h1").waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
