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
import { PORT } from "./support/env";

let staff: E2EUser;
let walkIn: E2EUser;
let slug: string;
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;

test.beforeEach(async () => {
  slug = `e2e-clientes-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Mostrador");
  staff = await createE2EUser("admin-clientes");
  walkIn = await createE2EUser("cliente-mostrador");
  await grantMembership(staff, slug);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await Promise.all([deleteE2EUser(staff), deleteE2EUser(walkIn)]);
});

test("el admin inscribe a un cliente con su mascota y él la ve al entrar con su correo", async ({
  browser,
}) => {
  const adminContext = await browser.newContext();
  await signInAs(adminContext, staff, `${slug}.localhost`);
  const page = await adminContext.newPage();

  await page.goto(at("/admin"));
  await page
    .getByRole("navigation", { name: "Panel" })
    .getByRole("link", { name: "Clientes" })
    .click();
  await expect(page).toHaveURL(at("/admin/clientes"));

  await page.getByRole("link", { name: "Inscribir cliente" }).click();
  await page.getByRole("textbox", { name: "Nombre completo" }).fill("Carlos Ruiz");
  await page.getByRole("textbox", { name: "WhatsApp" }).fill("+57 310 555 1234");
  await page.getByRole("textbox", { name: /Correo/ }).fill(walkIn.email);
  await page.getByRole("button", { name: "Inscribir cliente" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Carlos Ruiz" })).toBeVisible();
  await expect(page.getByText("Sin cuenta")).toBeVisible();

  await page.getByRole("link", { name: "Agregar mascota" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Nueva mascota de Carlos Ruiz" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Toby");
  await page.getByRole("combobox", { name: "Raza" }).selectOption({ label: "Pug" });
  await page.getByRole("button", { name: "Guardar mascota" }).click();
  const toby = page.getByRole("listitem").filter({ hasText: "Toby" });
  await expect(toby).toContainText("Pug · Pequeño (S)");

  // El staff fija la talla a mano (p. ej. un pug muy grande).
  await toby.getByRole("link", { name: /Editar/ }).click();
  await page.getByRole("checkbox", { name: /Fijar talla y pelo/ }).check();
  await page.getByRole("combobox", { name: "Talla fija" }).selectOption("L");
  await page.getByRole("button", { name: "Guardar mascota" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Toby" })).toContainText(
    "Grande (L) · Corto · fijada",
  );

  // Búsqueda por teléfono.
  await page.goto(at("/admin/clientes"));
  await page.getByRole("searchbox", { name: "Buscar cliente" }).fill("555 1234");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("link", { name: "Carlos Ruiz" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar cliente" }).fill("nadie");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("No encontramos clientes")).toBeVisible();
  await adminContext.close();

  // El cliente entra con Google (mismo correo): ve su mascota sin completar el perfil.
  const customerContext = await browser.newContext();
  await signInAs(customerContext, walkIn, `${slug}.localhost`);
  const customerPage = await customerContext.newPage();
  await customerPage.goto(at("/mascotas"));
  await expect(customerPage).toHaveURL(at("/mascotas"));
  await expect(customerPage.getByRole("listitem").filter({ hasText: "Toby" })).toBeVisible();
  await customerContext.close();
});

test("no tiene scroll horizontal a 320px", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await signInAs(context, staff, `${slug}.localhost`);
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/admin/clientes", "/admin/clientes/nuevo"]) {
    await page.goto(at(path));
    await page.locator("h1").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
