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
    name: "0w0-foo",
    workers_dev: true,
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
