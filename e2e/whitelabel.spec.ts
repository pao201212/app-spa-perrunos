import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PORT = 3000;
const TENANTS = [
  { slug: "spaperrunosygatunos", name: "Spa Perrunos y Gatunos" },
  { slug: "demo", name: "Spa Demo" },
];
const WIDTHS = [320, 360, 768, 1024, 1280, 1920];

test.describe("white-label: dos marcas sobre el mismo código", () => {
  test("cada tenant muestra su logo y sus colores", async ({ page }) => {
    const looks: { logo: string; ctaBg: string }[] = [];

    for (const { slug, name } of TENANTS) {
      await page.goto(`http://${slug}.localhost:${PORT}/`);
      const logo = page.getByRole("img", { name });
      await expect(logo).toBeVisible();

      const logoUrl = await logo.evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(logoUrl).toContain(`/tenants/${slug}/assets/`);

      const ctaBg = await page
        .getByRole("link", { name: "Reservar" })
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      looks.push({ logo: logoUrl, ctaBg });
    }

    expect(looks[0].logo).not.toBe(looks[1].logo);
    expect(looks[0].ctaBg).not.toBe(looks[1].ctaBg);
  });

  for (const { slug } of TENANTS) {
    test(`${slug}: la portada no tiene violaciones de accesibilidad serias`, async ({ page }) => {
      await page.goto(`http://${slug}.localhost:${PORT}/`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).analyze();
      const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});

test.describe("sin scroll horizontal de 320 a 1920px", () => {
  // Un solo proyecto basta: el viewport se fija explícitamente.
  test.skip(({ isMobile }) => isMobile, "se recorre el rango completo desde el proyecto desktop");

  const pages = [
    ...TENANTS.map(({ slug }) => `http://${slug}.localhost:${PORT}/`),
    `http://admin.localhost:${PORT}/`,
    `http://noexiste.localhost:${PORT}/`,
  ];

  for (const url of pages) {
    test(url, async ({ page }) => {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(url);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `scroll horizontal a ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }
});
