import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import {
  createE2EUser,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

// PNG de 1×1 px para la foto.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let customer: E2EUser;
let slug: string;
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;

test.beforeEach(async () => {
  slug = `e2e-cliente-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Clientes");
  customer = await createE2EUser("cliente");
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(customer);
});

async function completeProfile(page: Page) {
  await page.goto(at("/mascotas"));
  await expect(page).toHaveURL(at("/perfil?next=%2Fmascotas"));
  await page.getByRole("textbox", { name: "Nombre completo" }).fill("Ana Pérez");
  await page.getByRole("textbox", { name: "WhatsApp" }).fill("+57 300 123 4567");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page).toHaveURL(at("/mascotas"));
}

async function addPet(
  page: Page,
  fields: { name: string; breed: string; weight?: string; coat?: string },
) {
  await page.getByRole("link", { name: "Agregar mascota" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Nueva mascota" })).toBeVisible();
  await page.getByRole("textbox", { name: "Nombre" }).fill(fields.name);
  await page.getByRole("combobox", { name: "Especie" }).selectOption("dog");
  await page.getByRole("combobox", { name: "Raza" }).selectOption({ label: fields.breed });
  if (fields.weight) await page.getByRole("textbox", { name: /Peso/ }).fill(fields.weight);
  if (fields.coat) await page.getByRole("combobox", { name: "Pelo" }).selectOption(fields.coat);
  await page.getByRole("button", { name: "Guardar mascota" }).click();
}

const petCard = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });

test("sin sesión pide ingresar", async ({ page }) => {
  await page.goto(at("/mascotas"));
  await expect(page).toHaveURL(at("/ingresar?next=%2Fmascotas"));
});

test("completa el perfil y registra mascotas de raza y criollas", async ({ page, context }) => {
  await signInAs(context, customer, `${slug}.localhost`);
  await completeProfile(page);
  await expect(page.getByText("Aún no tienes mascotas registradas")).toBeVisible();

  await addPet(page, { name: "Max", breed: "Golden Retriever" });
  await expect(page).toHaveURL(at("/mascotas"));
  await expect(petCard(page, "Max")).toContainText("Golden Retriever · Grande (L) · Largo");

  // Criollo: el pelo y el peso los indica el cliente (D9).
  await page.getByRole("link", { name: "Agregar mascota" }).click();
  await page.getByRole("combobox", { name: "Raza" }).selectOption({ label: "Criollo / Mestizo" });
  await expect(page.getByRole("combobox", { name: "Pelo" })).toBeVisible();
  await page.getByRole("textbox", { name: "Nombre" }).fill("Luna");
  await page.getByRole("button", { name: "Guardar mascota" }).click();
  await expect(page.getByText("Indica el peso: con él calculamos la talla")).toBeVisible();

  await page.getByRole("textbox", { name: /Peso/ }).fill("25");
  await page.getByRole("combobox", { name: "Pelo" }).selectOption("medium");
  await page.getByRole("button", { name: "Guardar mascota" }).click();
  await expect(petCard(page, "Luna")).toContainText("Criollo / Mestizo · Grande (L) · Medio");

  // Editar: foto y peso; la talla se recalcula.
  await petCard(page, "Max")
    .getByRole("link", { name: /Editar/ })
    .click();
  await page.getByRole("textbox", { name: /Peso/ }).fill("8");
  await page
    .getByLabel("Foto")
    .setInputFiles({ name: "max.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Guardar mascota" }).click();
  await expect(petCard(page, "Max")).toContainText("Pequeño (S)");
  await expect(petCard(page, "Max").getByRole("img", { name: "Foto de Max" })).toHaveAttribute(
    "src",
    /token=/,
  );

  // Quitar una mascota.
  await petCard(page, "Luna")
    .getByRole("link", { name: /Editar/ })
    .click();
  await page.getByRole("button", { name: "Quitar mascota" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Quitar" }).click();
  await expect(page).toHaveURL(at("/mascotas"));
  await expect(petCard(page, "Luna")).toHaveCount(0);
});

test("el perfil muestra el correo de la cuenta y permite cambiar el WhatsApp", async ({
  page,
  context,
}) => {
  await signInAs(context, customer, `${slug}.localhost`);
  await completeProfile(page);
  await page
    .getByRole("navigation", { name: "Mi cuenta" })
    .getByRole("link", { name: "Perfil" })
    .click();
  await expect(page.getByText(customer.email)).toBeVisible();
  await page.getByRole("textbox", { name: "WhatsApp" }).fill("+57 311 000 0000");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByRole("status")).toHaveText("Perfil guardado");
});

test("no tiene scroll horizontal a 320px", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await signInAs(context, customer, `${slug}.localhost`);
  await completeProfile(page);
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/mascotas", "/mascotas/nueva", "/perfil"]) {
    await page.goto(at(path));
    await page.locator("h1").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
