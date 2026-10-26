import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  createCustomerWithPets,
  createE2EUser,
  createLocation,
  createOwnCustomer,
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

// SPEC §9: 0 violaciones serias o críticas de axe en las vistas de capacidad y reservas.

let slug: string;
let locationId: string;
let customerId: string;
let users: E2EUser[] = [];
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;
const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

async function expectNoSeriousViolations(page: Page) {
  await page.locator("h1").waitFor();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

test.beforeEach(async () => {
  slug = `e2e-a11y-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Accesible");
  locationId = await createLocation(slug, "Sede accesible");
  await seedLocationConfig(slug, locationId);
  const bath = await createService(slug, "Baño");
  await seedBathDurations(bath, [{ size: "M", coat: "short" }]);
  await seedSimpleCapacity(locationId, bath);
  customerId = await createCustomerWithPets(slug, "Lucía Gómez", ["Rocky"], true);
  await seedBathAppointment(
    locationId,
    customerId,
    `${day}T08:00:00-05:00`,
    `${day}T09:30:00-05:00`,
  );
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await Promise.all(users.map((u) => deleteE2EUser(u)));
  users = [];
});

test("vistas del cliente: reservar y mis citas", async ({ page, context }) => {
  const customer = await createE2EUser("cliente-a11y");
  users.push(customer);
  await createOwnCustomer(slug, customer, ["Max"]);
  await signInAs(context, customer, `${slug}.localhost`);

  await page.goto(at("/reservar"));
  await expectNoSeriousViolations(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: /Baño/ }).check();
  await expectNoSeriousViolations(page);

  await page.goto(at("/citas"));
  await expectNoSeriousViolations(page);
});

test("vistas del admin: agenda, ocupación, cupo, nueva cita y capacidad", async ({
  page,
  context,
}) => {
  const staff = await createE2EUser("admin-a11y");
  users.push(staff);
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);

  for (const path of [
    `/admin/agenda?local=${locationId}&fecha=${day}`,
    `/admin/ocupacion?local=${locationId}`,
    `/admin/locales/${locationId}`,
    `/admin/citas/nueva?q=Luc`,
    `/admin/citas/nueva?cliente=${customerId}`,
  ]) {
    await page.goto(at(path));
    await expectNoSeriousViolations(page);
  }

  await page.goto(at(`/admin/locales/${locationId}/disponibilidad?date=${day}`));
  await page.getByLabel("Servicio").selectOption({ label: "Baño" });
  await page.getByRole("button", { name: "Ver horas" }).click();
  await page.getByRole("region", { name: "Horas del día" }).waitFor();
  await expectNoSeriousViolations(page);
});
