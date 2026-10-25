import stylelint from "stylelint";
import { describe, expect, it } from "vitest";

async function lint(code: string, codeFilename: string) {
  const { results } = await stylelint.lint({ code, codeFilename });
  return results[0].warnings.map((w) => w.rule);
}

describe("regla white-label de stylelint", () => {
  it.each([
    ["un color hex", ".a { color: #fff; }"],
    ["un color rgb()", ".a { background: rgb(0 0 0); }"],
    ["un color con nombre", ".a { color: red; }"],
    ["una fuente concreta", ".a { font-family: Arial, sans-serif; }"],
    ["una sombra concreta", ".a { box-shadow: 0 1px 2px black; }"],
    ["un radio concreto", ".a { border-radius: 12px; }"],
  ])("rechaza %s en un componente", async (_, code) => {
    expect(await lint(code, "src/components/ui/Button.module.css")).not.toEqual([]);
  });

  it("acepta tokens del tema en un componente", async () => {
    const code = `.a {
      color: var(--color-text);
      background: var(--color-surface);
      font-family: var(--font-body);
      box-shadow: var(--shadow-card);
      border-radius: var(--radius-md);
    }
    input { font: inherit; }
    .b { font: 600 1rem / 1.2 var(--font-body); }`;
    expect(await lint(code, "src/components/ui/Card.module.css")).toEqual([]);
  });

  it("permite colores y fuentes concretos dentro de un theme.css de tenant", async () => {
    const code = ":root { --color-primary: #4daaf8; --font-body: 'Manrope', sans-serif; }";
    expect(await lint(code, "tenants/demo/theme.css")).toEqual([]);
  });
});
