import globals from "globals";
import pluginJs from "@eslint/js";
import eslint from "typescript-eslint";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import stylistic from '@stylistic/eslint-plugin';
import compat from "eslint-plugin-compat";

export default [
  {
    ignores: [
      "dist/",
      "dev-dist/",
      "eslint.config.js",
      "gen-static.js",
      "vite-env.d.ts",
      "vite.config.ts",
    ]
  },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    }
  },
  compat.configs["flat/recommended"],
  pluginJs.configs.recommended,
  // ...eslint.configs.strict,
  // ...tseslint.configs.strictTypeChecked,
  ...eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylistic,
  pluginReact.configs.flat.recommended,
  {
    plugins: { "@stylistic": stylistic },
    rules: {
      "eqeqeq": ["error", "smart"],
      "react/react-in-jsx-scope": "off",
      "@stylistic/indent": ["error", 2],
      "@stylistic/semi": "error",
      "@stylistic/comma-dangle": ["error", {
        arrays: "always-multiline",
        objects: "always-multiline",
        imports: "always-multiline",
        exports: "always-multiline",
      }],
      "@stylistic/brace-style": ["error", "stroustrup", {
        allowSingleLine: true,
      }],
      "@stylistic/arrow-parens": ["error", "always"],
      "@stylistic/space-infix-ops": "error",
      "@stylistic/operator-linebreak": ["error", "before"],
      "@stylistic/member-delimiter-style": ["error", {
        multiline: { delimiter: "comma" },
        singleline: { delimiter: "comma" },
      }],
      "@stylistic/no-mixed-operators": "error",
      "@stylistic/quote-props": ["error", "consistent-as-needed"],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-unnecessary-condition": ["error", { allowConstantLoopConditions: 'only-allowed-literals' }],
    },
  },
  {
    settings: {
      react: { version: "detect" },
      polyfills: ["DecompressionStream"],
    },
  },
];
