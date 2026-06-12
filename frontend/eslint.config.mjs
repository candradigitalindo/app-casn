import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next 15.x masih berformat legacy (extends),
// jadi dimuat lewat FlatCompat.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    rules: {
      // Kode existing masih banyak memakai `any` — diturunkan ke warning
      // agar build tidak gagal; bersihkan bertahap.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
