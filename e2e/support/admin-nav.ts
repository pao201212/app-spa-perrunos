import type { Page } from "@playwright/test";

/**
 * Va a una sección del panel como lo haría una persona: en escritorio desde la barra lateral;
 * en móvil desde la barra inferior o, si la sección no está ahí, desde "Más".
 */
export async function openAdminSection(page: Page, label: string): Promise<void> {
  const nav = page.getByRole("navigation", { name: "Panel" });
  // isVisible() no espera: primero hay que esperar a que el panel termine de cargar.
  await nav.getByRole("link", { name: "Inicio", exact: true }).waitFor();
  const direct = nav.getByRole("link", { name: label, exact: true });
  if (await direct.isVisible()) {
    await direct.click();
    return;
  }
  await nav.getByRole("button", { name: "Más" }).click();
  await page
    .getByRole("dialog", { name: "Más" })
    .getByRole("link", { name: label, exact: true })
    .click();
}
