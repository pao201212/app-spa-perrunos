import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import {
  createE2EUser,
  deleteE2EUser,
  deleteLocationByName,
  grantMembership,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

const demo = (path: string) => `http://demo.localhost:${PORT}${path}`;
let staff: E2EUser;

test.beforeAll(async () => {
  staff = await createE2EUser("admin-locales");
  await grantMembership(staff, "demo");
});

test.afterAll(async () => {
  await deleteE2EUser(staff);
});

test.beforeEach(async ({ context }) => {
  await signInAs(context, staff, "demo.localhost");
});

async function expectStatus(page: Page, form: string, text: RegExp | string) {
  await expect(page.getByRole("region", { name: form }).getByRole("status")).toHaveText(text);
}

test("el panel enlaza a Locales y lista la sede del seed", async ({ page }) => {
  await page.goto(demo("/admin"));
  await page
    .getByRole("navigation", { name: "Panel" })
    .getByRole("link", { name: "Locales" })
    .click();
  await expect(page).toHaveURL(demo("/admin/locales"));
  await expect(page.getByRole("link", { name: "Sede principal" })).toBeVisible();
});

test("crea un local y configura reservas, estaciones, horario y cierres", async ({ page }) => {
  const name = `Sede E2E ${randomUUID().slice(0, 6)}`;
  try {
    await page.goto(demo("/admin/locales/nuevo"));
    await page.getByLabel("Nombre del local").fill(name);
    await page.getByLabel("WhatsApp").fill("+57 300 123 4567");
    await page.getByRole("button", { name: "Crear local" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    const booking = page.getByRole("region", { name: "Reservas" });
    await booking.getByLabel("Confirmación de reservas").selectOption("manual");
    await booking.getByLabel("Reservas hasta (días a futuro)").fill("15");
    await booking.getByRole("button", { name: "Guardar ajustes" }).click();
    await expectStatus(page, "Reservas", "Ajustes guardados");

    const stations = page.getByRole("region", { name: "Estaciones" });
    await stations.getByLabel("Estaciones de baño").fill("3");
    await stations.getByLabel("Mesas de secado").fill("4");
    await stations.getByRole("button", { name: "Guardar estaciones" }).click();
    await expectStatus(page, "Estaciones", "Estaciones guardadas");

    const hours = page.getByRole("region", { name: "Horario" });
    await hours.getByLabel("Día").selectOption("1");
    await hours.getByLabel("Abre").fill("08:00");
    await hours.getByLabel("Cierra").fill("12:00");
    await hours.getByRole("button", { name: "Agregar tramo" }).click();
    await expect(hours.getByRole("listitem").filter({ hasText: "Lunes" })).toContainText(
      "08:00 – 12:00",
    );

    await hours.getByLabel("Abre").fill("11:00");
    await hours.getByLabel("Cierra").fill("13:00");
    await hours.getByRole("button", { name: "Agregar tramo" }).click();
    await expectStatus(page, "Horario", /se cruza/);

    const closures = page.getByRole("region", { name: "Días de cierre" });
    await closures.getByLabel("Fecha").fill("2026-12-31");
    await closures.getByLabel("Motivo").fill("Fin de año");
    await closures.getByRole("button", { name: "Agregar cierre" }).click();
    const closure = closures.getByRole("listitem").filter({ hasText: "Fin de año" });
    await expect(closure).toBeVisible();
    await closure.getByRole("button", { name: /Quitar/ }).click();
    await expect(closures.getByRole("listitem").filter({ hasText: "Fin de año" })).toHaveCount(0);

    // Los cambios persisten al recargar.
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Reservas" }).getByLabel("Confirmación de reservas"),
    ).toHaveValue("manual");
    await expect(
      page.getByRole("region", { name: "Estaciones" }).getByLabel("Mesas de secado"),
    ).toHaveValue("4");
  } finally {
    await deleteLocationByName(name);
  }
});

test("los locales no tienen scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(demo("/admin/locales"));
  await page.getByRole("link", { name: "Sede principal" }).click();
  await page.locator("h1").waitFor();
  for (const path of ["/admin", "/admin/locales", page.url().replace(demo(""), "")]) {
    await page.goto(demo(path));
    await page.locator("h1").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `scroll horizontal en ${path}`).toBeLessThanOrEqual(0);
  }
});
