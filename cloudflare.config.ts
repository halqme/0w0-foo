import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    assets: {
      notFoundHandling: "404-page",
    },
    compatibilityDate: "2026-05-10",
    compatibilityFlags: ["nodejs_compat"],
    domains: ["0w0.foo"],
    name: "0w0-foo",
    observability: {
      enabled: true,
    },
  },
});
