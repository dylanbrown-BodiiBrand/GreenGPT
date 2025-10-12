// eslint.config.ts (flat config)
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Next.js + TypeScript base
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Scoped override: relax rules in API routes and utils only
  {
    files: [
      "src/app/api/**/*.{ts,tsx}",
      "src/utils/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { args: "none", ignoreRestSiblings: true }
      ],
    },
  },
];
