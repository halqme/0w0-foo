import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import UnoCSS from "unocss/astro";
import { linkCardPlugin } from "./src/plugins/link-card";

export default defineConfig({
  fonts: [
    {
      cssVariable: "--font-shippori-antique",
      name: "Shippori Antique",
      provider: fontProviders.fontsource(),
      weights: [400],
    },
    {
      cssVariable: "--font-ia-writer-mono",
      name: "iA Writer Mono",
      provider: fontProviders.fontsource(),
      weights: [400, 500],
    },
  ],
  integrations: [
    UnoCSS({
      injectReset: true,
    }),
    sitemap(),
  ],
  markdown: {
    processor: satteri({
      features: { gfm: true },
      hastPlugins: [linkCardPlugin],
    }),
  },
  site: "https://0w0.foo",
});
