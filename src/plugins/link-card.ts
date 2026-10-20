import { defineHastPlugin } from "satteri";
import type { Element, ElementContent, Properties } from "hast";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getLinkCardData,
  linkCardClasses,
  type LinkCardData,
} from "../lib/link-card";

const ogpCache = new Map<string, LinkCardData>();

function createElement(
  tagName: string,
  properties: Properties = {},
  children: ElementContent[] = [],
): Element {
  return {
    children,
    properties,
    tagName,
    type: "element",
  };
}

function findAllBareUrls(): string[] {
  const urls = new Set<string>();
  const blogDir = join(process.cwd(), "src/content/blog");
  let files: string[];

  try {
    files = readdirSync(blogDir).filter((file) => file.endsWith(".md"));
  } catch {
    return [];
  }

  const urlPattern =
    /(?<!\()https?:\/\/[^\s<>"')]+(?:\/[^\s<>"')]*)?(?![^\s<>"')]*\))/g;

  for (const file of files) {
    const content = readFileSync(join(blogDir, file), "utf-8");
    let match: RegExpExecArray | null;

    while ((match = urlPattern.exec(content)) !== null) {
      const url = match[0].replace(/[.,;:!]+$/, "");
      try {
        const parsedUrl = new URL(url);
        urls.add(parsedUrl.href);
      } catch {
        // Ignore invalid URLs.
      }
    }
  }

  return [...urls];
}

const allUrls = findAllBareUrls();
await Promise.allSettled(
  allUrls.map(async (url) => {
    ogpCache.set(url, await getLinkCardData(url));
  }),
);

function isBareUrlLink(
  node: Element,
  ctx: { textContent(node: Element): string },
): boolean {
  const href =
    typeof node.properties?.href === "string" ? node.properties.href : "";
  if (!href) return false;
  const anchorText = ctx.textContent(node).trim();
  if (!anchorText) return false;
  return anchorText === href;
}

function isElementWithTag(node: unknown, tag: string): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    Reflect.get(node, "type") === "element" &&
    Reflect.get(node, "tagName") === tag
  );
}

export const linkCardPlugin = defineHastPlugin({
  element: {
    filter: [],
    visit(node, ctx) {
      if (node.tagName !== "p") return;
      if (node.children.length !== 1) return;

      const linkNode = node.children[0];
      if (!isElementWithTag(linkNode, "a")) return;

      const href =
        typeof linkNode.properties?.href === "string"
          ? linkNode.properties.href
          : undefined;
      if (!href) return;

      if (
        href.startsWith("/") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;

      if (!isBareUrlLink(linkNode, ctx)) return;

      const image = ogpCache.get(href)?.image;
      if (!image) return;

      ctx.replaceNode(
        node,
        createElement(
          "a",
          {
            className: [linkCardClasses.card],
            href,
            ariaLabel: href,
          },
          [
            createElement(
              "span",
              { className: [linkCardClasses.imageContainer] },
              [
                createElement("img", {
                  alt: "",
                  className: [linkCardClasses.image],
                  loading: "lazy",
                  src: image,
                }),
              ],
            ),
          ],
        ),
      );
    },
  },
  name: "link-card",
});
