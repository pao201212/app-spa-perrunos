import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  createExtra,
  createLocation,
  createService,
  createTenant,
  deleteE2EUser,
  deleteTenantBySlug,
  grantMembership,
  seedBathDurations,
  signInAs,
  type E2EUser,
} from "./support/auth";
import { PORT } from "./support/env";

let staff: E2EUser;
let slug: string;
const at = (path: string) => `http://${slug}.localhost:${PORT}${path}`;

test.beforeEach(async ({ context }) => {
  slug = `e2e-precios-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Precios");
  await createLocation(slug, "Sede Norte");
  await createLocation(slug, "Sede Sur");
  staff = await createE2EUser("admin-precios");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("fija precios por local, exige la matriz completa y los copia a otros locales", async ({
  page,
}) => {
  const serviceId = await createService(slug, "Baño");
  await seedBathDurations(serviceId, [
    { size: "M", coat: "short" },
    { size: "M", coat: "long" },
  ]);
  await createExtra(serviceId, "Cepillado");

  await page.goto(at(`/admin/servicios/${serviceId}`));
  await page.getByRole("link", { name: "Precios por local" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Precios · Baño" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sede Norte" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("No se ofrece en este local")).toBeVisible();

  const service = page.getByRole("region", { name: "Baño" });
  await service.getByRole("textbox", { name: "Mediano (M) · Corto" }).fill("45.000");
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(service.getByText(/Falta el precio/)).toBeVisible();

  await service.getByRole("textbox", { name: "Mediano (M) · Largo" }).fill("55000");
  const extra = page.getByRole("region", { name: "Extra: Cepillado" });
  await extra.getByRole("textbox", { name: "Precio para todas" }).fill("5.000");
  await extra.getByRole("button", { name: "Aplicar a todas" }).click();
  await expect(extra.getByRole("textbox", { name: "Mediano (M) · Largo" })).toHaveValue("5.000");
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Precios guardados" })).toBeVisible();
  await expect(page.getByText("Se ofrece en este local")).toBeVisible();

  await page.getByRole("button", { name: "Copiar a los demás locales" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Copiar" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Precios copiados a 1 local" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Sede Sur" }).click();
  await expect(page.getByRole("link", { name: "Sede Sur" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page
      .getByRole("region", { name: "Baño" })
      .getByRole("textbox", { name: "Mediano (M) · Largo" }),
  ).toHaveValue("55.000");
});

test("sin duraciones pide definirlas primero", async ({ page }) => {
  const serviceId = await createService(slug, "Baño nuevo");
  await page.goto(at(`/admin/servicios/${serviceId}/precios`));
  await expect(page.getByText("Primero define las duraciones de este servicio")).toBeVisible();
});

test("no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  const serviceId = await createService(slug, "Baño");
  await seedBathDurations(serviceId, [{ size: "M", coat: "short" }]);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(at(`/admin/servicios/${serviceId}/precios`));
  await page.locator("h1").waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
