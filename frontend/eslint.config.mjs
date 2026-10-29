import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";

// eslint-config-next exporte ici une config legacy ("extends") : on la
// convertit en flat config compatible avec ESLint 9.
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  resolvePluginsRelativeTo: import.meta.dirname,
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Le contenu de l'application est en français : les apostrophes typographiques
    // sont excessives. On tolère les apostrophes simples dans le texte JSX.
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
