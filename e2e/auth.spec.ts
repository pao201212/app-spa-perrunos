import { expect, test } from "@playwright/test";

import { createE2EUser, deleteE2EUser, signInAs, type E2EUser } from "./support/auth";

const PORT = 3000;
const demo = (path: string) => `http://demo.localhost:${PORT}${path}`;

test.describe("ingreso con Google", () => {
  for (const host of ["demo.localhost", "admin.localhost"]) {
    test(`${host}: el botón inicia OAuth con Google y vuelve al callback del mismo host`, async ({
      page,
    }) => {
      let authorizeUrl: URL | undefined;
      await page.route("**/auth/v1/authorize**", async (route) => {
        authorizeUrl = new URL(route.request().url());
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<h1>Google (simulado)</h1>",
        });
      });

      await page.goto(`http://${host}:${PORT}/ingresar?next=/reservar`);
      await page.getByRole("button", { name: "Continuar con Google" }).click();
      await expect(page.getByRole("heading", { name: "Google (simulado)" })).toBeVisible();

      expect(authorizeUrl?.searchParams.get("provider")).toBe("google");
      expect(authorizeUrl?.searchParams.get("redirect_to")).toBe(
        `http://${host}:${PORT}/auth/callback?next=%2Freservar`,
      );
    });
  }

  test("el callback sin código vuelve a /ingresar del mismo host con un error visible", async ({
    page,
  }) => {
    await page.goto(demo("/auth/callback?next=/reservar"));
    await expect(page).toHaveURL(demo("/ingresar?error=auth"));
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "No pudimos iniciar sesión. Intenta de nuevo.",
    );
  });

  test("el callback nunca redirige a otro dominio", async ({ page }) => {
    await page.goto(demo("/auth/callback?code=invalido&next=//evil.example"));
    expect(new URL(page.url()).host).toBe(`demo.localhost:${PORT}`);
  });
});

test.describe("con sesión iniciada", () => {
  let user: E2EUser;

  test.beforeAll(async () => {
    user = await createE2EUser("cliente");
  });

  test.afterAll(async () => {
    await deleteE2EUser(user);
  });

  test("el servidor reconoce la sesión", async ({ page, context }) => {
    await signInAs(context, user, "demo.localhost");
    await page.goto(demo("/ingresar"));
    await expect(page.getByText(`Sesión iniciada como ${user.email}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toHaveCount(0);
  });
});
