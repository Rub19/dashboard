import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".turbo/**",
    "out/**",
    "build/**",
    "dist/**",
    "android/**",
    "ios/**",
    "node_modules/**",
    "scripts/**",
    "next-env.d.ts",
    "jest.env.js",
  ]),
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // Auto-fixable: strips imports that are never referenced. The heavy lifter
      // for the dead-code sweep (most warnings were unused icon imports).
      "unused-imports/no-unused-imports": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/rules-of-hooks": "warn",
      "prefer-const": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
