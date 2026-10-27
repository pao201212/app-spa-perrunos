import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  createService,
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
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;

test.beforeEach(async ({ context }) => {
  slug = `e2e-opcionales-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Opcionales");
  staff = await createE2EUser("admin-opcionales");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("el baño tiene opcionales sin costo marcados por etapa", async ({ page }) => {
  const serviceId = await createService(slug, "Baño");
  await page.goto(at(`/admin/servicios/${serviceId}`));
  const options = page.getByRole("region", { name: "Opcionales sin costo" });

  await options
    .getByRole("textbox", { name: "Nombre del opcional" })
    .fill("Shampoo hipoalergénico");
  await options.getByRole("combobox", { name: "Etapa" }).selectOption("bath");
  await options.getByRole("button", { name: "Agregar opcional" }).click();
  await expect(
    options.getByRole("listitem").filter({ hasText: "Shampoo hipoalergénico" }),
  ).toContainText("En el baño");

  // La etapa elegida se conserva para el siguiente.
  await expect(options.getByRole("combobox", { name: "Etapa" })).toHaveValue("bath");
  await options.getByRole("combobox", { name: "Etapa" }).selectOption("details");
  await options.getByRole("textbox", { name: "Nombre del opcional" }).fill("Corte higiénico");
  await options.getByRole("button", { name: "Agregar opcional" }).click();
  const hygienic = options.getByRole("listitem").filter({ hasText: "Corte higiénico" });
  await expect(hygienic).toContainText("En los detalles");

  await hygienic.getByRole("button", { name: /Quitar/ }).click();
  await expect(options.getByRole("listitem").filter({ hasText: "Corte higiénico" })).toHaveCount(0);
});

test("los servicios que no son baño no tienen opcionales", async ({ page }) => {
  const serviceId = await createService(slug, "Corte de raza", "special_cut");
  await page.goto(at(`/admin/servicios/${serviceId}`));
  await expect(page.getByRole("heading", { level: 1, name: "Corte de raza" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Opcionales sin costo" })).toHaveCount(0);
});
