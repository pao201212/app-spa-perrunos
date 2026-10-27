import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  createCustomerWithPets,
  createE2EUser,
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
  slug = `e2e-grupos-${randomUUID().slice(0, 6)}`;
  await createTenant(slug, "Spa Grupos");
  staff = await createE2EUser("admin-grupos");
  await grantMembership(staff, slug);
  await signInAs(context, staff, `${slug}.localhost`);
});

test.afterEach(async () => {
  await deleteTenantBySlug(slug);
  await deleteE2EUser(staff);
});

test("agrupa mascotas que se bañan juntas y las separa", async ({ page }) => {
  const customerId = await createCustomerWithPets(slug, "Marta Gómez", ["Lola", "Pepa", "Toto"]);
  await page.goto(at(`/admin/clientes/${customerId}`));

  const section = page.getByRole("region", { name: "Se bañan juntas" });
  await section.getByRole("checkbox", { name: "Lola" }).check();
  await section.getByRole("button", { name: "Agrupar" }).click();
  await expect(section.getByRole("status")).toHaveText("Elige al menos dos mascotas");

  await section.getByRole("checkbox", { name: "Pepa" }).check();
  await section.getByRole("button", { name: "Agrupar" }).click();
  const group = section.getByRole("listitem").filter({ hasText: "Lola" });
  await expect(group).toContainText("Pepa");
  // Ya agrupadas: solo queda Toto disponible.
  await expect(section.getByRole("checkbox", { name: "Lola" })).toHaveCount(0);

  await group.getByRole("button", { name: /Separar/ }).click();
  await expect(section.getByRole("listitem").filter({ hasText: "Pepa" })).toHaveCount(0);
  await expect(section.getByRole("checkbox", { name: "Lola" })).toBeVisible();
});
