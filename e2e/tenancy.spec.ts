import { expect, test } from "@playwright/test";

const PORT = 3000;
const url = (host: string, path = "/") => `http://${host}:${PORT}${path}`;

test.describe("enrutamiento por subdominio", () => {
  for (const [slug, name] of [
    ["spaperrunosygatunos", "Spa Perrunos y Gatunos"],
    ["demo", "Spa Demo"],
  ] as const) {
    test(`${slug}.localhost muestra ${name}`, async ({ page }) => {
      const response = await page.goto(url(`${slug}.localhost`));
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    });
  }

  test("admin.localhost lleva a la consola (pide ingresar sin sesión)", async ({ page }) => {
    const response = await page.goto(url("admin.localhost"));
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Ingresar" })).toBeVisible();
  });

  for (const [caso, host, path] of [
    ["un spa inexistente", "noexiste.localhost", "/"],
    ["el dominio raíz", "localhost", "/"],
    ["una ruta interna accedida directamente", "demo.localhost", "/s/demo"],
  ] as const) {
    test(`responde 404 para ${caso}`, async ({ page }) => {
      const response = await page.goto(url(host, path));
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
    });
  }
});
