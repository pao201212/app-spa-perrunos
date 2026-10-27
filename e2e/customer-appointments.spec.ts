import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  createLocation,
  createOwnCustomer,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  seedBathAppointment,
  setAppointmentsStatus,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

let customer: E2EUser;
let slug: string;
let locationId: string;
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;
const inDays = (days: number, time: string) => {
  const date = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  return `${date}T${time}:00-05:00`;
};

test.beforeEach(async ({ context }) => {
  slug = `e2e-citas-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Citas");
  locationId = await createLocation(slug, "Sede citas");
  customer = await createE2EUser("cliente-citas");
  const customerId = await createOwnCustomer(slug, customer, ["Max"]);
  await seedBathAppointment(locationId, customerId, inDays(3, "08:00"), inDays(3, "09:30"));
  await signInAs(context, customer, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(customer);
});

test("ve su cita activa y confirma la recepción cuando el spa recibe a la mascota", async ({
  page,
}) => {
  await page.goto(at("/mascotas"));
  await page
    .getByRole("navigation", { name: "Mi cuenta" })
    .getByRole("link", { name: "Mis citas" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Mis citas" })).toBeVisible();

  const upcoming = page.getByRole("region", { name: "Próximas" });
  const card = upcoming.getByRole("listitem");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("Agendada");
  await expect(card).toContainText("Max");
  await expect(card).toContainText("Sede citas");
  await expect(card).toContainText("09:30");
  await expect(card.getByRole("button", { name: /Confirmar/ })).toHaveCount(0);

  await setAppointmentsStatus(locationId, "received");
  await page.reload();
  await expect(card).toContainText("Recibida");
  await card.getByRole("button", { name: "Confirmar que el spa recibió a Max" }).click();
  await expect(card).toContainText("Confirmaste la recepción.");
  await expect(card.getByRole("button", { name: /Confirmar/ })).toHaveCount(0);
});

test("las citas entregadas pasan al historial", async ({ page }) => {
  await setAppointmentsStatus(locationId, "delivered");
  await page.goto(at("/citas"));
  await expect(page.getByRole("region", { name: "Próximas" })).toContainText(
    "No tienes citas próximas.",
  );
  await expect(page.getByRole("region", { name: "Historial" }).getByRole("listitem")).toContainText(
    "Entregada",
  );
});

test("Mis citas no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(at("/citas"));
  await page.locator("h1").waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
