import { defineConfig } from "cf/config";

export default defineConfig({
  accountId: "c9a475b1ebdae14f6b44b531f5f6d795",
  worker: {
    name: "0w0-foo",
    compatibilityDate: "2026-05-10",
    workersDev: false,
    previewUrls: false,
    observability: {
      enabled: false,
      traces: {
        enabled: false,
      },
    },
    assets: {
      notFoundHandling: "404-page",
    },
    domains: ["0w0.foo"],
  },
});
