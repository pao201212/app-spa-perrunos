import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createE2EUser,
  createLocation,
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
  slug = `e2e-personal-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Personal");
  await createLocation(slug, "Sede Norte");
  staff = await createE2EUser("admin-personal");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("registra a una persona con habilidades, turnos y ausencias", async ({ page }) => {
  await page.goto(at("/admin"));
  await page
    .getByRole("navigation", { name: "Panel" })
    .getByRole("link", { name: "Personal" })
    .click();
  await expect(page).toHaveURL(at("/admin/personal"));

  await page.getByRole("link", { name: "Nuevo integrante" }).click();
  await page.getByRole("textbox", { name: "Nombre" }).fill("Ana Bañadora");
  await page.getByRole("checkbox", { name: "Baña" }).check();
  await page.getByRole("checkbox", { name: "Seca" }).check();
  await page.getByRole("button", { name: "Crear integrante" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ana Bañadora" })).toBeVisible();

  const shifts = page.getByRole("region", { name: "Turnos" });
  await shifts.getByRole("combobox", { name: "Local" }).selectOption({ label: "Sede Norte" });
  await shifts.getByRole("combobox", { name: "Día" }).selectOption("6");
  await shifts.getByLabel("Inicio").fill("08:00");
  await shifts.getByLabel("Fin").fill("13:00");
  await shifts.getByRole("button", { name: "Agregar turno" }).click();
  await expect(shifts.getByRole("listitem").filter({ hasText: "Sábado" })).toContainText(
    "08:00 – 13:00 · Sede Norte",
  );

  await shifts.getByLabel("Inicio").fill("12:00");
  await shifts.getByLabel("Fin").fill("15:00");
  await shifts.getByRole("button", { name: "Agregar turno" }).click();
  await expect(shifts.getByRole("status")).toHaveText(/se cruza/);

  const absences = page.getByRole("region", { name: "Ausencias" });
  await absences.getByLabel("Desde").fill("2026-12-24T08:00");
  await absences.getByLabel("Hasta").fill("2026-12-26T18:00");
  await absences.getByLabel("Motivo").fill("Vacaciones");
  await absences.getByRole("button", { name: "Agregar ausencia" }).click();
  const absence = absences.getByRole("listitem").filter({ hasText: "Vacaciones" });
  await expect(absence).toContainText("jue 24 dic 2026, 08:00");
  await absence.getByRole("button", { name: /Quitar/ }).click();
  await expect(absences.getByRole("listitem").filter({ hasText: "Vacaciones" })).toHaveCount(0);

  const details = page.getByRole("region", { name: "Datos" });
  await details.getByRole("checkbox", { name: "Terminado" }).check();
  await details.getByRole("button", { name: "Guardar datos" }).click();
  await expect(details.getByRole("status")).toHaveText("Datos guardados");

  await page
    .getByRole("navigation", { name: "Panel" })
    .getByRole("link", { name: "Personal" })
    .click();
  const row = page.getByRole("listitem").filter({ hasText: "Ana Bañadora" });
  await expect(row).toContainText("Baña");
  await expect(row).toContainText("Terminado");
});

test("no tiene scroll horizontal a 320px", async ({ page, isMobile }) => {
  test.skip(isMobile, "el ancho se fija explícitamente desde el proyecto desktop");
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/admin/personal", "/admin/personal/nuevo"]) {
    await page.goto(at(path));
    await page.locator("h1").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
