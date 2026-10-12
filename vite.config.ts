import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [".agents/", ".cloudflare/", "**/*.astro"],
    printWidth: 80,
    sortPackageJson: false,
    sortTailwindcss: {},
  },
  lint: {
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    env: {
      browser: true,
      es2022: true,
      node: true,
    },
    globals: {},
    ignorePatterns: [
      "dist/",
      ".astro/",
      ".agents/",
      ".cloudflare/",
      "node_modules/",
      ".cache/",
    ],
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: ["*.test.ts", "*.spec.ts", "**/*.test.ts", "**/*.spec.ts"],
        rules: {
          "no-unused-vars": "off",
        },
      },
      {
        files: ["src/pages/**/*.ts", "src/pages/**/*.tsx"],
        rules: {
          "no-unused-vars": "warn",
        },
      },
      {
        files: ["**/*.astro"],
        rules: {
          "unicorn/filename-case": "off",
        },
      },
    ],
    plugins: ["typescript", "unicorn", "oxc", "import"],
    rules: {
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "error",
      "no-debugger": "warn",
      "no-magic-numbers": "allow",
      "no-unused-vars": "error",
      "sort-keys": "allow",
      "unicorn/filename-case": "warn",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    settings: {
      jsdoc: {
        augmentsExtendsReplacesDocs: false,
        exemptDestructuredRootsFromChecks: false,
        ignoreInternal: false,
        ignorePrivate: false,
        ignoreReplacesDocs: true,
        implementsReplacesDocs: false,
        overrideReplacesDocs: true,
        tagNamePreference: {},
      },
      "jsx-a11y": {
        attributes: {},
        components: {},
      },
      next: {
        rootDir: [],
      },
      vitest: {
        typecheck: false,
      },
    },
  },
});
