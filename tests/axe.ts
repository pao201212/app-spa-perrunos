import axe from "axe-core";

/** Violaciones de accesibilidad de un contenedor (sin color-contrast: jsdom no calcula estilos). */
export async function axeViolations(container: Element) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`);
}
