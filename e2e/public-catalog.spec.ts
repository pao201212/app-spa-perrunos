import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { PORT } from "./support/env";

// Datos del seed de Spa Demo: Sede principal, Baño desde $38.000, Corte de raza solo perros.
const demo = (path: string) => `http://demo.localhost:${PORT}${path}`;

test("la portada muestra los locales con horario y WhatsApp", async ({ page }) => {
  await page.goto(demo("/"));
  const sede = page.getByRole("region", { name: "Sede principal" });
  await expect(sede).toContainText("Lunes a viernes");
  await expect(sede).toContainText("08:00–12:30 · 13:00–18:00");
  await expect(sede).toContainText("Domingo");
  await expect(sede.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
    "href",
    "https://wa.me/573000000000",
  );
});

test("el catálogo muestra los servicios ofrecidos con su precio desde", async ({ page }) => {
  await page.goto(demo("/"));
  await page.getByRole("link", { name: "Ver servicios" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Servicios" })).toBeVisible();

  const higiene = page.getByRole("region", { name: "Higiene" });
  const bath = higiene.getByRole("listitem").filter({ hasText: "Baño" });
  await expect(bath).toContainText(/Desde \$\s?38\.000/);
  await expect(bath).toContainText("Perros y gatos");
  await expect(bath).toContainText("Cepillado profundo");

  const cut = page
    .getByRole("region", { name: "Estilo" })
    .getByRole("listitem")
    .filter({ hasText: "Corte de raza" });
  await expect(cut).toContainText("Solo perros");
  await expect(page.getByRole("link", { name: "Reservar" }).first()).toBeVisible();
});

test("el catálogo no tiene violaciones de accesibilidad serias ni scroll horizontal", async ({
  page,
}) => {
  await page.goto(demo("/servicios"));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
  ).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
