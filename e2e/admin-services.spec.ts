import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  grantMembership,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { openAdminSection } from "./support/admin-nav";
import { PORT } from "./support/env";

let staff: E2EUser;
let slug: string;
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;

test.beforeEach(async ({ context }) => {
  slug = `e2e-servicios-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Servicios");
  staff = await createE2EUser("admin-servicios");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("crea categorías, servicios y extras", async ({ page }) => {
  await page.goto(at("/admin"));
  await openAdminSection(page, "Servicios");
  await expect(page.getByRole("heading", { level: 1, name: "Servicios" })).toBeVisible();

  const categories = page.getByRole("region", { name: "Categorías" });
  await categories.getByRole("textbox", { name: "Nueva categoría" }).fill("Higiene");
  await categories.getByRole("button", { name: "Agregar categoría" }).click();
  await expect(categories.getByRole("listitem").filter({ hasText: "Higiene" })).toBeVisible();

  await page.getByRole("link", { name: "Nuevo servicio" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Nuevo servicio" })).toBeVisible();
  await page.getByRole("textbox", { name: "Nombre del servicio" }).fill("Baño completo");
  await page.getByRole("combobox", { name: "Tipo" }).selectOption("bath");
  await page.getByRole("combobox", { name: "Categoría" }).selectOption({ label: "Higiene" });
  await page.getByRole("combobox", { name: "Para" }).selectOption("both");
  await page.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Baño completo" })).toBeVisible();

  const extras = page.getByRole("region", { name: "Extras" });
  await extras.getByRole("textbox", { name: "Nombre del extra" }).fill("Cepillado profundo");
  await extras.getByRole("textbox", { name: /Minutos/ }).fill("7");
  await extras.getByRole("button", { name: "Agregar extra" }).click();
  await expect(extras.getByText("Usa múltiplos de 5")).toBeVisible();
  await extras.getByRole("textbox", { name: /Minutos/ }).fill("10");
  await extras.getByRole("button", { name: "Agregar extra" }).click();
  await expect(
    extras.getByRole("listitem").filter({ hasText: "Cepillado profundo" }),
  ).toContainText("+10 min");

  const details = page.getByRole("region", { name: "Datos del servicio" });
  await details.getByRole("checkbox", { name: /Activo/ }).uncheck();
  await details.getByRole("button", { name: "Guardar servicio" }).click();
  await expect(details.getByRole("status")).toHaveText("Servicio guardado");

  await openAdminSection(page, "Servicios");
  const row = page.getByRole("listitem").filter({ hasText: "Baño completo" });
  await expect(row).toContainText("Inactivo");
  await expect(row).toContainText("1 extra");
});

test("no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/admin/servicios", "/admin/servicios/nuevo"]) {
    await page.goto(at(path));
    await page.locator("h1").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
