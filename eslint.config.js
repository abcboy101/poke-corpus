import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import stylistic from '@stylistic/eslint-plugin';
import compat from "eslint-plugin-compat";

export default [
  { ignores: ["dist/", "dev-dist/"] },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  compat.configs["flat/recommended"],
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    plugins: { "@stylistic": stylistic },
    rules: {
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
    },
  },
  {
    settings: {
      react: { version: "detect" },
      polyfills: ["DecompressionStream"],
    },
  },
];
