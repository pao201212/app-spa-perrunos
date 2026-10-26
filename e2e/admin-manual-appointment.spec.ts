import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import {
  countAppointments,
  countOverbooked,
  createCustomerWithPets,
  createE2EUser,
  createLocation,
  createService,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  grantMembership,
  seedBathAppointment,
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
let customerId: string;
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;

/** Primer lunes al menos 7 días después de hoy (YYYY-MM-DD). */
function nextMonday(): string {
  const date = new Date(Date.now() + 7 * 86_400_000);
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

test.beforeEach(async ({ context }) => {
  slug = `e2e-cita-admin-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Citas Admin");
  locationId = await createLocation(slug, "Sede admin");
  await seedLocationConfig(slug, locationId); // lunes 08:00-12:30
  const bath = await createService(slug, "Baño");
  await seedBathDurations(bath, [{ size: "M", coat: "short" }]);
  await seedSimpleCapacity(locationId, bath);
  customerId = await createCustomerWithPets(slug, "Lucía Gómez", ["Rocky"], true);
  staff = await createE2EUser("admin-citas");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

const step = (page: Page, name: string) =>
  expect(page.getByRole("heading", { level: 2, name: new RegExp(`${name}$`) })).toBeVisible();

async function reachHours(page: Page) {
  await page.goto(at(`/admin/clientes/${customerId}`));
  await page.getByRole("link", { name: "Crear cita" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Nueva cita para Lucía Gómez" }),
  ).toBeVisible();
  await step(page, "Mascotas");
  await page.getByRole("button", { name: "Continuar" }).click();
  await step(page, "Servicios");
  await page.getByRole("radio", { name: /Baño/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await step(page, "Local");
  await page.getByRole("button", { name: "Continuar" }).click();
  await step(page, "Hora");
  await page.getByLabel("Día").fill(nextMonday());
}

test("el admin crea una cita para un cliente inscrito", async ({ page }) => {
  await reachHours(page);
  await page.getByRole("radio", { name: /08:00.*entrega aprox\. 09:30/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await step(page, "Resumen");
  await page.getByRole("button", { name: "Crear cita" }).click();
  await expect(page.getByRole("heading", { name: "Cita creada" })).toBeVisible();
  expect(await countAppointments(locationId)).toBe(1);
  expect(await countOverbooked(locationId)).toBe(0);
});

test("con el día lleno, el admin puede crearla con sobrecupo tras confirmarlo", async ({
  page,
}) => {
  const monday = nextMonday();
  const other = await createCustomerWithPets(slug, "Otra clienta", ["Toby"]);
  await seedBathAppointment(
    locationId,
    other,
    `${monday}T10:00:00-05:00`,
    `${monday}T11:30:00-05:00`,
    1,
  );

  await reachHours(page);
  const slot = page.getByRole("radio", { name: /08:00.*Sobrecupo · Cupo lleno/ });
  await slot.check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await step(page, "Resumen");
  await expect(page.getByText(/Se creará con sobrecupo: Día lleno/)).toBeVisible();

  await page.getByRole("button", { name: "Crear cita" }).click();
  const dialog = page.getByRole("dialog", { name: "¿Crear con sobrecupo?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Sí, crear con sobrecupo" }).click();
  await expect(page.getByRole("heading", { name: "Cita creada" })).toBeVisible();
  expect(await countOverbooked(locationId)).toBe(1);
});

test("busca al cliente desde Nueva cita", async ({ page }) => {
  await page.goto(at("/admin/citas/nueva"));
  await page.getByRole("searchbox", { name: "Buscar cliente" }).fill("Lucía");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("link", { name: "Elegir a Lucía Gómez" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Nueva cita para Lucía Gómez" }),
  ).toBeVisible();
});
