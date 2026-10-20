import { describe, expect, it } from "vite-plus/test";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { createLinkCardPlugin } from "./link-card";

const href = "https://example.test/article";
const image = "/.astro/link-card-images/hero.png";

async function render(
  source: string,
  cards: Record<string, { image: string }> = { [href]: { image } },
) {
  const processor = await createSatteriMarkdownProcessor({
    syntaxHighlight: false,
    hastPlugins: [createLinkCardPlugin(cards)],
  });
  return processor.render(source);
}

describe("link cards in Markdown", () => {
  it("invalidates Astro's serialized content configuration when images change, not when discovery order changes", () => {
    const first = { [href]: { image }, "https://other.test/": { image: "" } };
    const reordered = Object.fromEntries(Object.entries(first).toReversed());
    expect(createLinkCardPlugin(first).name).toBe(
      createLinkCardPlugin(reordered).name,
    );
    expect(createLinkCardPlugin(first).name).not.toBe(
      createLinkCardPlugin({ ...first, [href]: { image: "" } }).name,
    );
  });

  it("registers OGP images for Astro's getImage pipeline with dimensions and an accessible link", async () => {
    const result = await render(href);
    expect(result.metadata.localImagePaths).toEqual([image]);
    expect(result.code).toContain(`href="${href}"`);
    expect(result.code).toContain(`aria-label="${href}"`);
    expect(result.code).toContain("__ASTRO_IMAGE_");
    expect(result.code).toContain("1200");
    expect(result.code).toContain("630");
  });

  it("matches canonical URL keys without changing the destination link", async () => {
    const result = await render("https://example.test", {
      "https://example.test/": { image },
    });
    expect(result.metadata.localImagePaths).toEqual([image]);
    expect(result.code).toContain('href="https://example.test"');
  });

  it("keeps a readable URL link when no image is available", async () => {
    const result = await render(href, { [href]: { image: "" } });
    expect(result.code).toContain(`>${href}</a>`);
    expect(result.code).not.toContain("<img");
    expect(result.metadata.localImagePaths).toEqual([]);
  });

  it.each([
    "[Read this](https://example.test/article)",
    "text https://example.test/article",
    "[/local](/local)",
    "[#section](#section)",
    "[mail](mailto:a@example.test)",
    "[phone](tel:123)",
  ])("preserves named, inline, and non-external links: %s", async (source) => {
    const result = await render(source);
    expect(result.code).not.toContain("<img");
    expect(result.metadata.localImagePaths).toEqual([]);
  });
});
