// Contrato white-label (SPEC §10 Never do): fuera de tenants/*/theme.css no hay colores,
// fuentes, sombras ni radios concretos; solo tokens var(--…).
const token = (prefix) => `/^var\\(--${prefix}[a-z0-9-]*\\)$/`;

/** @type {import("stylelint").Config} */
const config = {
  ignoreFiles: [".next/**", "node_modules/**", "public/**", "coverage/**"],
  rules: {
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": [
      "rgb",
      "rgba",
      "hsl",
      "hsla",
      "hwb",
      "lab",
      "lch",
      "oklab",
      "oklch",
      "color",
    ],
    "declaration-property-value-allowed-list": {
      "font-family": [token("font-"), "inherit"],
      "box-shadow": [token("shadow-"), "none"],
      "/^border(-(top|bottom)-(left|right))?-radius$/": [token("radius-"), "0", "50%", "inherit"],
    },
    "declaration-property-value-disallowed-list": {
      // El shorthand `font` debe tomar la familia de un token (o heredarla).
      font: ["/^(?!inherit$)(?!.*var\\(--font-).*$/"],
    },
  },
  overrides: [
    {
      files: ["tenants/**/*.css"],
      rules: {
        "color-no-hex": null,
        "color-named": null,
        "function-disallowed-list": null,
        "declaration-property-value-allowed-list": null,
        "declaration-property-value-disallowed-list": null,
      },
    },
  ],
};

export default config;
