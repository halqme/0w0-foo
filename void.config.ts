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
    account_id: "6f3952eeee5de35be423fccd773015f8",
    name: "0w0-foo",
    workers_dev: false,
    preview_urls: false,
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
