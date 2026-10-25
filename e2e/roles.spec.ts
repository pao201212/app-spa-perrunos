import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  deleteE2EUser,
  grantMembership,
  grantSuperAdmin,
  signInAs,
  type E2EUser,
} from "./support/auth";

const PORT = 3000;
const at = (host: string, path = "/") => `http://${host}.localhost:${PORT}${path}`;

let client: E2EUser;
let demoAdmin: E2EUser;
let multiAdmin: E2EUser;
let superAdmin: E2EUser;

test.beforeAll(async () => {
  [client, demoAdmin, multiAdmin, superAdmin] = await Promise.all([
    createE2EUser("cliente"),
    createE2EUser("admin-demo"),
    createE2EUser("admin-multi"),
    createE2EUser("super"),
  ]);
  await grantMembership(demoAdmin, "demo");
  await grantMembership(multiAdmin, "demo");
  await grantMembership(multiAdmin, "spaperrunosygatunos");
  await grantSuperAdmin(superAdmin);
});

test.afterAll(async () => {
  await Promise.all([client, demoAdmin, multiAdmin, superAdmin].map(deleteE2EUser));
});

test.describe("panel del spa (/admin)", () => {
  test("sin sesión pide ingresar y recuerda el destino", async ({ page }) => {
    await page.goto(at("demo", "/admin"));
    await expect(page).toHaveURL(at("demo", "/ingresar?next=%2Fadmin"));
  });

  test("un cliente no tiene acceso", async ({ page, context }) => {
    await signInAs(context, client, "demo.localhost");
    await page.goto(at("demo", "/admin"));
    await expect(page).toHaveURL(at("demo", "/sin-acceso"));
    await expect(
      page.getByRole("heading", { name: "No tienes acceso a esta sección" }),
    ).toBeVisible();
  });

  test("el admin del spa entra a su panel", async ({ page, context }) => {
    await signInAs(context, demoAdmin, "demo.localhost");
    await page.goto(at("demo", "/admin"));
    await expect(page.getByRole("heading", { level: 1, name: "Panel · Spa Demo" })).toBeVisible();
  });

  test("el admin de un spa no entra al panel de otro", async ({ page, context }) => {
    await signInAs(context, demoAdmin, "spaperrunosygatunos.localhost");
    await page.goto(at("spaperrunosygatunos", "/admin"));
    await expect(page).toHaveURL(at("spaperrunosygatunos", "/sin-acceso"));
  });

  test("el super admin entra al panel de cualquier spa", async ({ page, context }) => {
    await signInAs(context, superAdmin, "spaperrunosygatunos.localhost");
    await page.goto(at("spaperrunosygatunos", "/admin"));
    await expect(
      page.getByRole("heading", { level: 1, name: "Panel · Spa Perrunos y Gatunos" }),
    ).toBeVisible();
  });

  test("cerrar sesión vuelve a la pantalla de ingreso", async ({ page, context }) => {
    await signInAs(context, demoAdmin, "demo.localhost");
    await page.goto(at("demo", "/admin"));
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(at("demo", "/ingresar"));
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
    await page.goto(at("demo", "/admin"));
    await expect(page).toHaveURL(/\/ingresar\?next=%2Fadmin$/);
  });
});

test.describe("consola de plataforma (admin.*)", () => {
  test("sin sesión pide ingresar", async ({ page }) => {
    await page.goto(at("admin"));
    await expect(page).toHaveURL(at("admin", "/ingresar?next=%2F"));
  });

  test("el super admin ve la consola", async ({ page, context }) => {
    await signInAs(context, superAdmin, "admin.localhost");
    await page.goto(at("admin"));
    await expect(page.getByRole("heading", { level: 1, name: "Consola Prisma Lab" })).toBeVisible();
  });

  test("el admin de un solo spa es enviado a su panel", async ({ page, context }) => {
    await signInAs(context, demoAdmin, "admin.localhost");
    // La redirección a otro host ocurre en el cliente y aborta la navegación inicial.
    await page.goto(at("admin")).catch(() => undefined);
    // En local las cookies no se comparten entre subdominios: llega al panel y se le pide ingresar ahí.
    await page.waitForURL(new RegExp(`^${at("demo", "/")}`));
  });

  test("el admin de varios spas elige cuál administrar", async ({ page, context }) => {
    await signInAs(context, multiAdmin, "admin.localhost");
    await page.goto(at("admin"));
    await expect(page).toHaveURL(at("admin", "/elegir"));
    await expect(page.getByRole("link", { name: "Spa Demo" })).toHaveAttribute(
      "href",
      at("demo", "/admin"),
    );
    await expect(page.getByRole("link", { name: "Spa Perrunos y Gatunos" })).toHaveAttribute(
      "href",
      at("spaperrunosygatunos", "/admin"),
    );
  });

  test("un cliente no tiene acceso a la consola", async ({ page, context }) => {
    await signInAs(context, client, "admin.localhost");
    await page.goto(at("admin"));
    await expect(page).toHaveURL(at("admin", "/sin-acceso"));
  });
});
