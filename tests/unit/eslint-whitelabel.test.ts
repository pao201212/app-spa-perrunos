import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function ruleIds(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => m.ruleId);
}

describe("regla white-label de ESLint", () => {
  it.each([
    ["un color hex", 'export const A = () => <p style={{ color: "#fff" }} />;'],
    ["un color rgb()", 'export const A = () => <p style={{ background: "rgb(0 0 0)" }} />;'],
    ["un color hsl()", 'export const c = "hsl(10 20% 30%)";'],
  ])("rechaza %s en código de la app", async (_, code) => {
    expect(await ruleIds(code, "src/components/Example.tsx")).toContain("no-restricted-syntax");
  });

  it("acepta tokens del tema", async () => {
    const code = 'export const A = () => <p style={{ color: "var(--color-text)" }} />;';
    expect(await ruleIds(code, "src/components/Example.tsx")).not.toContain("no-restricted-syntax");
  });
});
