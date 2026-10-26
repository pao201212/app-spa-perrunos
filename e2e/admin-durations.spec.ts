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
  slug = `e2e-duraciones-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Duraciones");
  staff = await createE2EUser("admin-duraciones");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("define duraciones por talla y pelo; acordeón en móvil, tabla en escritorio", async ({
  page,
  isMobile,
}) => {
  const serviceId = await createService(slug, "Baño");
  await page.goto(at(`/admin/servicios/${serviceId}`));
  const matrix = page.getByRole("region", { name: "Duraciones" });

  const medium = matrix.getByRole("button", { name: /Mediano \(M\)/ });
  if (isMobile) {
    // En móvil cada talla es un acordeón cerrado.
    await expect(medium).toHaveAttribute("aria-expanded", "false");
    await medium.click();
  }
  await expect(medium).toHaveAttribute("aria-expanded", "true");

  await matrix.getByRole("textbox", { name: "Mediano (M) · Largo · Baño" }).fill("40");
  await matrix.getByRole("textbox", { name: "Mediano (M) · Largo · Secado" }).fill("30");
  await matrix.getByRole("button", { name: "Guardar duraciones" }).click();
  await expect(matrix.getByText("Completa las tres etapas o deja la fila vacía")).toBeVisible();

  await matrix.getByRole("textbox", { name: "Mediano (M) · Largo · Detalles" }).fill("20");
  await matrix.getByRole("button", { name: "Guardar duraciones" }).click();
  await expect(matrix.getByRole("status")).toHaveText("Duraciones guardadas (1 combinación)");

  await page.reload();
  const reloaded = page.getByRole("region", { name: "Duraciones" });
  if (isMobile) await reloaded.getByRole("button", { name: /Mediano \(M\)/ }).click();
  await expect(reloaded.getByRole("textbox", { name: "Mediano (M) · Largo · Baño" })).toHaveValue(
    "40",
  );
  await expect(reloaded.getByRole("button", { name: /Mediano \(M\)/ })).toContainText("1 de 3");
});

test("un corte especial solo pide minutos de corte", async ({ page, isMobile }) => {
  const serviceId = await createService(slug, "Corte de raza", "special_cut");
  await page.goto(at(`/admin/servicios/${serviceId}`));
  const matrix = page.getByRole("region", { name: "Duraciones" });
  if (isMobile) await matrix.getByRole("button", { name: /Grande \(L\)/ }).click();
  await expect(matrix.getByRole("textbox", { name: /· Baño$/ })).toHaveCount(0);
  await expect(matrix.getByRole("textbox", { name: "Grande (L) · Corto · Corte" })).toHaveCount(1);
});

test("no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  const serviceId = await createService(slug, "Baño");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(at(`/admin/servicios/${serviceId}`));
  await page.locator("h1").waitFor();
  await page.getByRole("button", { name: /Mediano \(M\)/ }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
