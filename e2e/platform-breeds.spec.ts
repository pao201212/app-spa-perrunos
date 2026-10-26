import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  deleteE2EUser,
  deleteGlobalBreedByName,
  grantSuperAdmin,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

const razas = (path = "") => `http://admin.localhost:${PORT}/razas${path}`;
let superAdmin: E2EUser;

test.beforeAll(async () => {
  superAdmin = await createE2EUser("super-razas");
  await grantSuperAdmin(superAdmin);
});

test.afterAll(async () => {
  await deleteE2EUser(superAdmin);
});

test.beforeEach(async ({ context }) => {
  await signInAs(context, superAdmin, "admin.localhost");
});

test("la consola enlaza al catálogo y lista las razas del legado", async ({ page }) => {
  await page.goto(`http://admin.localhost:${PORT}/`);
  await page.getByRole("link", { name: "Razas" }).click();
  await expect(page).toHaveURL(razas());
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo de razas" })).toBeVisible();
  const golden = page.getByRole("listitem").filter({ hasText: "Golden Retriever" });
  await expect(golden).toContainText("Grande (L)");
  await expect(golden).toContainText("Largo");
});

test("filtra por nombre y especie", async ({ page }) => {
  await page.goto(razas());
  await page.getByLabel("Buscar raza").fill("persa");
  await expect(page.getByRole("listitem").filter({ hasText: "Persa" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Golden Retriever" })).toHaveCount(0);

  await page.getByLabel("Buscar raza").fill("");
  await page.getByLabel("Especie").selectOption("cat");
  await expect(page.getByRole("listitem").filter({ hasText: "Golden Retriever" })).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "Maine Coon" })).toBeVisible();
});

test("crea, edita y elimina una raza", async ({ page }) => {
  const name = `Raza E2E ${randomUUID().slice(0, 6)}`;
  try {
    await page.goto(razas("/nueva"));
    await page.getByLabel("Nombre de la raza").fill(name);
    await page.getByLabel("Especie").selectOption("dog");
    await page.getByLabel("Talla por defecto").selectOption("M");
    await page.getByLabel("Pelo por defecto").selectOption("medium");
    await page.getByRole("button", { name: "Guardar raza" }).click();
    await expect(page).toHaveURL(razas());

    const row = page.getByRole("listitem").filter({ hasText: name });
    await expect(row).toContainText("Mediano (M)");
    await row.getByRole("link", { name: "Editar" }).click();

    await page.getByLabel("Talla por defecto").selectOption("XL");
    await page.getByRole("button", { name: "Guardar raza" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: name })).toContainText(
      "Muy grande (XL)",
    );

    await page
      .getByRole("listitem")
      .filter({ hasText: name })
      .getByRole("link", { name: "Editar" })
      .click();
    await page.getByRole("button", { name: "Eliminar raza" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(page).toHaveURL(razas());
    await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
  } finally {
    await deleteGlobalBreedByName(name);
  }
});

test("no permite razas repetidas en la misma especie", async ({ page }) => {
  await page.goto(razas("/nueva"));
  await page.getByLabel("Nombre de la raza").fill("golden retriever");
  await page.getByLabel("Especie").selectOption("dog");
  await page.getByLabel("Talla por defecto").selectOption("L");
  await page.getByLabel("Pelo por defecto").selectOption("long");
  await page.getByRole("button", { name: "Guardar raza" }).click();
  await expect(page.getByText("Ya existe una raza con ese nombre para esa especie")).toBeVisible();
});

test("las páginas de la consola no tienen scroll horizontal en 320px", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/", "/razas", "/razas/nueva", "/spas/demo", "/spas/nuevo"]) {
    await page.goto(`http://admin.localhost:${PORT}${path}`);
    await page.locator("h1").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `scroll horizontal en ${path}`).toBeLessThanOrEqual(0);
  }
});
