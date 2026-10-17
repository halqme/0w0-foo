import { defineConfig } from "void/config";

export default defineConfig({
  inference: {
    appType: "static",
    outputDir: "dist",
    build: "astro build",
  },
  routing: {
    notFound: "404-page",
  },
  worker: {
    compatibility_date: "2026-05-10",
    compatibility_flags: ["nodejs_compat"],
  },
  cloudflare: {
    account_id: "c9a475b1ebdae14f6b44b531f5f6d795",
    name: "0w0-foo",
    workers_dev: false,
    preview_urls: true,
    observability: {
      enabled: true,
    },
    routes: [
      {
        pattern: "0w0.foo",
        custom_domain: true,
      },
    ],
  },
});
