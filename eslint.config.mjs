import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const HARDCODED_COLOR = String.raw`/^\s*(#[0-9a-fA-F]{3,8}|(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\()/`;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Contrato white-label (SPEC §10): los colores solo viven en tenants/*/theme.css.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${HARDCODED_COLOR}]`,
          message: "Usa un token del tema (var(--color-…)) en lugar de un color concreto.",
        },
        {
          selector: `TemplateElement[value.raw=${HARDCODED_COLOR}]`,
          message: "Usa un token del tema (var(--color-…)) en lugar de un color concreto.",
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "public/**", "next-env.d.ts"]),
]);

export default eslintConfig;
