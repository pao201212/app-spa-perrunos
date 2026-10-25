import { expect, test, type Page } from "@playwright/test";

const PORT = 3000;

async function computed(page: Page, selector: string, property: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);
}

test.describe("tema por tenant", () => {
  const cases = [
    { slug: "spaperrunosygatunos", bg: "rgb(248, 250, 251)", font: "Manrope" },
    { slug: "demo", bg: "rgb(255, 250, 243)", font: "Nunito" },
  ];

  for (const { slug, bg, font } of cases) {
    test(`${slug} carga su theme.css y aplica sus tokens`, async ({ page }) => {
      await page.goto(`http://${slug}.localhost:${PORT}/`);

      const themeLink = page.locator(`link[rel="stylesheet"][href="/tenants/${slug}/theme.css"]`);
      await expect(themeLink).toHaveCount(1);

      expect(await computed(page, "body", "background-color")).toBe(bg);
      expect(await computed(page, "body", "font-family")).toContain(font);
      await expect(
        page.locator(`link[rel="icon"][href="/tenants/${slug}/assets/favicon.png"]`),
      ).toHaveCount(1);
    });
  }

  test("la consola de plataforma usa el tema de Prisma Lab", async ({ page }) => {
    await page.goto(`http://admin.localhost:${PORT}/`);
    await expect(
      page.locator('link[rel="stylesheet"][href="/tenants/platform/theme.css"]'),
    ).toHaveCount(1);
  });

  test("los inputs usan al menos 16px para evitar el zoom en iOS", async ({ page }) => {
    await page.goto(`http://demo.localhost:${PORT}/`);
    const size = await page.evaluate(() => {
      const input = document.createElement("input");
      document.body.append(input);
      return parseFloat(getComputedStyle(input).fontSize);
    });
    expect(size).toBeGreaterThanOrEqual(16);
  });
});
