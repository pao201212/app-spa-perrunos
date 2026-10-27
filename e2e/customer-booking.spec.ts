import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import {
  countAppointments,
  createCustomerWithPets,
  createE2EUser,
  createLocation,
  createOwnCustomer,
  createService,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  seedBathAppointment,
  seedBathDurations,
  seedLocationConfig,
  seedSimpleCapacity,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

let customer: E2EUser;
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
  slug = `e2e-reserva-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Reservas");
  locationId = await createLocation(slug, "Sede reservas");
  await seedLocationConfig(slug, locationId); // lunes 08:00-12:30
  const bath = await createService(slug, "Baño");
  await seedBathDurations(bath, [{ size: "M", coat: "short" }]); // 90 min
  await seedSimpleCapacity(locationId, bath); // $45.000, 6 por día, 1 bañadora el lunes
  customer = await createE2EUser("cliente-reserva");
  await signInAs(context, customer, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(customer);
});

const step = (page: Page, name: string) =>
  expect(page.getByRole("heading", { level: 2, name: new RegExp(`${name}$`) })).toBeVisible();

async function reachHours(page: Page) {
  await page.goto(at("/reservar"));
  await step(page, "Mascotas");
  await expect(page.getByRole("checkbox", { name: /Max/ })).toBeChecked();
  await page.getByRole("button", { name: "Continuar" }).click();

  await step(page, "Servicios");
  await page.getByRole("radio", { name: /Baño/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await step(page, "Local");
  await expect(page.getByRole("radio", { name: /Sede reservas/ })).toBeChecked();
  await expect(page.getByText("$ 45.000")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  await step(page, "Hora");
  await page.getByLabel("Día").fill(nextMonday());
}

test("reserva un baño: mascota → servicio → local → hora con entrega → resumen", async ({
  page,
}) => {
  await createOwnCustomer(slug, customer, ["Max"]);
  await reachHours(page);
  await page.getByRole("radio", { name: /08:00.*entrega aprox\. 09:30/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();

  await step(page, "Resumen");
  await expect(page.getByText("Entrega aprox.")).toBeVisible();
  await expect(page.getByText("Total")).toBeVisible();
  await page.getByLabel("Notas para el spa (opcional)").fill("Es nervioso con el secador");
  await page.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(page.getByRole("heading", { name: "¡Reserva confirmada!" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Entrega aprox. 09:30");
  await expect(page.getByText(/Código de tu cita: [A-HJ-NP-Z2-9]{6}/)).toBeVisible();
  expect(await countAppointments(locationId)).toBe(1);
});

test("si el horario se ocupa antes de confirmar, vuelve a elegir hora", async ({ page }) => {
  await createOwnCustomer(slug, customer, ["Max"]);
  await reachHours(page);
  await page.getByRole("radio", { name: /08:00/ }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await step(page, "Resumen");

  // Otra persona toma la jornada completa del día.
  const other = await createCustomerWithPets(slug, "Otra clienta", ["Toby"]);
  const monday = nextMonday();
  await seedBathAppointment(
    locationId,
    other,
    `${monday}T10:00:00-05:00`,
    `${monday}T11:30:00-05:00`,
    1,
  );

  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await step(page, "Hora");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Ese horario acaba de ocuparse. Elige otra hora.",
  );
  await expect(page.getByText("No hay horas disponibles este día")).toBeVisible();
  expect(await countAppointments(locationId)).toBe(1);
});

test("sin mascotas, invita a registrar la primera", async ({ page }) => {
  await createOwnCustomer(slug, customer, []);
  await page.goto(at("/reservar"));
  await expect(page.getByText("Primero registra a la mascota.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
});

test("la reserva no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await createOwnCustomer(slug, customer, ["Max"]);
  await page.setViewportSize({ width: 320, height: 800 });
  await reachHours(page);
  await page.getByRole("radio", { name: /08:00/ }).waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
