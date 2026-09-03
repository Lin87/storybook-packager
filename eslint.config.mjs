import nextConfig from "eslint-config-next";
import nextTypescriptConfig from "eslint-config-next/typescript";
import nextPlugin from "@next/eslint-plugin-next";

const [nextBaseConfig, ...remainingNextConfig] = nextConfig;

const eslintConfig = [
  {
    ...nextBaseConfig,
    rules: {
      ...nextBaseConfig.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  ...remainingNextConfig,
  ...nextTypescriptConfig,
  {
    name: "react-hooks-compiler-advisory-compat",
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/electron/**/*"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
