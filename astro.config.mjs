import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import UnoCSS from "unocss/astro";
import { createLinkCardPlugin } from "./src/plugins/link-card";
import { tools } from "./src/data/tools";
import { findBlogLinkUrls, prepareLinkCards } from "./src/lib/link-card-build";

const cards = await prepareLinkCards([
  ...tools.map(({ url }) => url),
  ...findBlogLinkUrls(),
]);

export default defineConfig({
  vite: { define: { LINK_CARD_DATA: JSON.stringify(cards) } },
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
      hastPlugins: [createLinkCardPlugin(cards)],
    }),
  },
  site: "https://0w0.foo",
});
