import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import { defineConfig, fontProviders } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { pandacss } from "@pandacss/vite";
import { createHeadingMarkPlugin } from "./src/plugins/heading-mark";
import { createHighlightPlugin } from "./src/plugins/highlight";
import { createLinkCardPlugin } from "./src/plugins/link-card";
import { findBlogLinkUrls, prepareLinkCards } from "./src/lib/link-card-build";

const cards = await prepareLinkCards(findBlogLinkUrls());

export default defineConfig({
  fonts: [
    {
      cssVariable: "--font-shippori-antique",
      name: "Shippori Antique",
      provider: fontProviders.fontsource(),
      weights: [400],
    },
    {
      cssVariable: "--font-shippori-antique-b1",
      name: "Shippori Antique B1",
      provider: fontProviders.fontsource(),
      weights: [400],
    },
    {
      cssVariable: "--font-ia-writer-mono",
      name: "iA Writer Mono",
      provider: fontProviders.fontsource(),
      weights: [400, 700],
    },
  ],
  vite: {
    plugins: [pandacss({ transform: true })],
  },
  integrations: [sitemap(), mdx(), rss()],
  markdown: {
    // Shiki stays off. createHighlightPlugin renders fences with @pierre/highlights.
    syntaxHighlight: false,
    processor: satteri({
      features: { gfm: true },
      hastPlugins: [
        createHeadingMarkPlugin(),
        createHighlightPlugin(),
        createLinkCardPlugin(cards),
      ],
    }),
  },
  site: "https://0w0.foo",
});
