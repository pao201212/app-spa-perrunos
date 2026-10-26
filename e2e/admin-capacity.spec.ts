import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  createLocation,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  grantMembership,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

let staff: E2EUser;
let slug: string;
let locationId: string;
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;

test.beforeEach(async ({ context }) => {
  slug = `e2e-capacidad-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Capacidad");
  locationId = await createLocation(slug, "Sede capacidad");
  staff = await createE2EUser("admin-capacidad");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("capacidad simple por empleado; la avanzada aparece como Próximamente", async ({
  page,
  isMobile,
}) => {
  await page.goto(at(`/admin/locales/${locationId}`));
  const capacity = page.getByRole("region", { name: "Capacidad" });
  const modes = capacity.getByRole("list", { name: "Modo de capacidad" });
  await expect(modes.getByRole("listitem").nth(0)).toContainText(/Simple.*Activa/);
  await expect(modes.getByRole("listitem").nth(1)).toContainText(/Avanzada.*Próximamente/);

  const large = capacity.getByRole("button", { name: /Grande \(L\)/ });
  if (isMobile) {
    await expect(large).toHaveAttribute("aria-expanded", "false");
    await large.click();
  }
  await expect(large).toHaveAttribute("aria-expanded", "true");

  await capacity.getByRole("textbox", { name: "Perro · Grande (L) · Corto" }).fill("4");
  await capacity.getByRole("textbox", { name: "Gato · Grande (L) · Largo" }).fill("0");
  await capacity.getByRole("button", { name: "Guardar capacidad" }).click();
  await expect(capacity.getByText("Escribe un número entero (mínimo 1)")).toBeVisible();

  await capacity.getByRole("textbox", { name: "Gato · Grande (L) · Largo" }).fill("5");
  await capacity.getByRole("button", { name: "Guardar capacidad" }).click();
  await expect(capacity.getByRole("status")).toHaveText("Capacidad guardada (2 combinaciones)");

  await page.reload();
  const reloaded = page.getByRole("region", { name: "Capacidad" });
  if (isMobile) await reloaded.getByRole("button", { name: /Grande \(L\)/ }).click();
  await expect(reloaded.getByRole("textbox", { name: "Perro · Grande (L) · Corto" })).toHaveValue(
    "4",
  );
  await expect(reloaded.getByRole("button", { name: /Grande \(L\)/ })).toContainText("2 de 6");
});

test("zonas de espera: agrega, evita duplicados y quita", async ({ page }) => {
  await page.goto(at(`/admin/locales/${locationId}`));
  const zones = page.getByRole("region", { name: "Zonas de espera" });
  await expect(zones).toContainText("Sin zonas de espera");

  await zones.getByLabel("Nombre de la zona").fill("Sala de espera");
  await zones.getByLabel("Mascotas que caben").fill("4");
  await zones.getByRole("button", { name: "Agregar zona" }).click();
  await expect(zones.getByRole("status")).toHaveText("Sala de espera agregada");
  await expect(zones.getByRole("listitem")).toHaveText([/Sala de espera.*4 mascotas/]);
  await expect(zones.getByRole("note")).toHaveText(
    "A la vez puede haber hasta empleados en turno + 4 mascotas.",
  );

  await zones.getByLabel("Nombre de la zona").fill("sala de espera");
  await zones.getByLabel("Mascotas que caben").fill("2");
  await zones.getByRole("button", { name: "Agregar zona" }).click();
  await expect(zones.getByText("Ya hay una zona con ese nombre")).toBeVisible();

  await zones.getByRole("button", { name: "Quitar Sala de espera" }).click();
  await expect(zones.getByRole("listitem")).toHaveCount(0);
});

test("la capacidad no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(at(`/admin/locales/${locationId}`));
  await page.locator("h1").waitFor();
  await page.getByRole("button", { name: /Gigante \(XXL\)/ }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
