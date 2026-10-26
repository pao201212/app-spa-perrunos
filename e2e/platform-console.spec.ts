import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  deleteE2EUser,
  deleteInvite,
  deleteTenantBySlug,
  grantSuperAdmin,
  signInAs,
  type E2EUser,
} from "./support/auth";

const PORT = 3000;
const console_ = (path = "/") => `http://admin.localhost:${PORT}${path}`;

let superAdmin: E2EUser;

test.beforeAll(async () => {
  superAdmin = await createE2EUser("super-consola");
  await grantSuperAdmin(superAdmin);
});

test.afterAll(async () => {
  await deleteE2EUser(superAdmin);
});

test.beforeEach(async ({ context }) => {
  await signInAs(context, superAdmin, "admin.localhost");
});

test("lista los spas existentes", async ({ page }) => {
  await page.goto(console_());
  await expect(page.getByRole("link", { name: "Spa Perrunos y Gatunos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Spa Demo" })).toBeVisible();
});

test("crea un spa y queda disponible en su subdominio", async ({ page }) => {
  const slug = `e2e-${randomUUID().slice(0, 6)}`;
  try {
    await page.goto(console_());
    await page.getByRole("link", { name: "Nuevo spa" }).click();
    await page.getByLabel("Nombre del spa").fill("Spa E2E");
    await page.getByLabel("Subdominio").fill(slug);
    await page.getByRole("button", { name: "Crear spa" }).click();

    await expect(page).toHaveURL(console_(`/spas/${slug}`));
    await expect(page.getByRole("heading", { level: 1, name: "Spa E2E" })).toBeVisible();

    await page.goto(`http://${slug}.localhost:${PORT}/`);
    await expect(page.getByRole("heading", { level: 1, name: "Spa E2E" })).toBeVisible();
  } finally {
    await deleteTenantBySlug(slug);
  }
});

test("valida el subdominio antes de crear", async ({ page }) => {
  await page.goto(console_("/spas/nuevo"));
  await page.getByLabel("Nombre del spa").fill("Spa Inválido");
  await page.getByLabel("Subdominio").fill("admin");
  await page.getByRole("button", { name: "Crear spa" }).click();
  await expect(page.getByLabel("Subdominio")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(/palabras reservadas/)).toBeVisible();
});

test("no permite un subdominio en uso", async ({ page }) => {
  await page.goto(console_("/spas/nuevo"));
  await page.getByLabel("Nombre del spa").fill("Otro Demo");
  await page.getByLabel("Subdominio").fill("demo");
  await page.getByRole("button", { name: "Crear spa" }).click();
  await expect(page.getByText("Ese subdominio ya está en uso")).toBeVisible();
});

test("asigna un admin por correo y lo muestra como invitación pendiente", async ({ page }) => {
  const email = `nuevo-admin-${randomUUID().slice(0, 6)}@e2e.prismalab.local`;
  try {
    await page.goto(console_("/spas/demo"));
    await page.getByLabel("Correo del administrador").fill(email);
    await page.getByRole("button", { name: "Agregar administrador" }).click();
    await expect(page.getByRole("status")).toHaveText(/Invitación enviada/);
    const row = page.getByRole("listitem").filter({ hasText: email });
    await expect(row).toContainText("Invitación pendiente");
  } finally {
    await deleteInvite(email);
  }
});
