import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

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
  slug = `e2e-razas-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Razas");
  staff = await createE2EUser("admin-razas");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

const breedRow = (page: Page, name: string) =>
  page
    .getByRole("region", { name: "Razas del spa" })
    .getByRole("listitem")
    .filter({ hasText: name });

test("el panel enlaza a Razas y muestra el catálogo heredado", async ({ page }) => {
  await page.goto(at("/admin"));
  await openAdminSection(page, "Razas");
  await expect(page).toHaveURL(at("/admin/razas"));
  await expect(breedRow(page, "Golden Retriever")).toContainText("Grande (L)");
});

test("ajusta los umbrales de talla y valida que sean crecientes", async ({ page }) => {
  await page.goto(at("/admin/razas"));
  const dogs = page.getByRole("group", { name: "Perros" });
  await dogs.getByLabel("Mini (XS)").fill("6");
  await page.getByRole("button", { name: "Guardar tallas de perros" }).click();
  await expect(
    page.getByRole("region", { name: "Tallas por peso" }).getByRole("status").first(),
  ).toHaveText("Tallas de perros guardadas");

  await dogs.getByLabel("Pequeño (S)").fill("4");
  await page.getByRole("button", { name: "Guardar tallas de perros" }).click();
  await expect(dogs.getByText(/Debe ser mayor que 6 kg/)).toBeVisible();
});

test("ajusta una raza heredada, la restaura y oculta otra", async ({ page }) => {
  await page.goto(at("/admin/razas"));
  await breedRow(page, "Golden Retriever")
    .getByRole("link", { name: /Editar/ })
    .click();
  await page.getByRole("combobox", { name: "Talla", exact: true }).selectOption("XL");
  await page.getByRole("button", { name: "Guardar raza" }).click();
  await expect(breedRow(page, "Golden Retriever")).toContainText("Ajustada");
  await expect(breedRow(page, "Golden Retriever")).toContainText("Muy grande (XL)");

  await breedRow(page, "Golden Retriever")
    .getByRole("link", { name: /Editar/ })
    .click();
  await page.getByRole("button", { name: "Restaurar valores del catálogo" }).click();
  await expect(breedRow(page, "Golden Retriever")).toContainText("Grande (L)");
  await expect(breedRow(page, "Golden Retriever")).not.toContainText("Ajustada");

  await breedRow(page, "Pug")
    .getByRole("link", { name: /Editar/ })
    .click();
  await page.getByRole("checkbox", { name: "Visible para los clientes" }).uncheck();
  await page.getByRole("button", { name: "Guardar raza" }).click();
  await expect(breedRow(page, "Pug")).toContainText("Oculta");
});

test("crea y elimina una raza propia", async ({ page }) => {
  await page.goto(at("/admin/razas"));
  await page.getByRole("link", { name: "Nueva raza" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Nueva raza" })).toBeVisible();
  await page.getByRole("textbox", { name: "Nombre de la raza" }).fill("Abbey Refugio");
  await page.getByRole("combobox", { name: "Especie" }).selectOption("dog");
  await page.getByRole("combobox", { name: "Talla", exact: true }).selectOption("M");
  await page.getByRole("combobox", { name: "Pelo", exact: true }).selectOption("short");
  await page.getByRole("button", { name: "Crear raza" }).click();
  await expect(breedRow(page, "Abbey Refugio")).toContainText("Propia");

  await breedRow(page, "Abbey Refugio")
    .getByRole("link", { name: /Editar/ })
    .click();
  await page.getByRole("button", { name: "Eliminar raza" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
  await expect(page).toHaveURL(at("/admin/razas"));
  await expect(breedRow(page, "Abbey Refugio")).toHaveCount(0);
});

test("no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(at("/admin/razas"));
  await page.locator("h1").waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
