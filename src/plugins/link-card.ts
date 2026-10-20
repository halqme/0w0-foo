import { defineHastPlugin } from "satteri";
import { createHash } from "node:crypto";
import type { Element, ElementContent, Properties } from "hast";

import { linkCardClasses, type LinkCardData } from "../lib/link-card";

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

export function createLinkCardPlugin(cards: Record<string, LinkCardData>) {
  // Astro's content cache cannot see captured values or changes inside visitor functions.
  const digest = createHash("sha256")
    .update(
      JSON.stringify(
        Object.entries(cards).toSorted(([a], [b]) => a.localeCompare(b)),
      ),
    )
    .digest("hex");
  return defineHastPlugin({
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

        if (!URL.canParse(href)) return;
        const image = (cards[href] ?? cards[new URL(href).href])?.image;
        if (!image) return;

        // Satteri's image-marker runs after this plugin and delegates to Astro getImage().
        const astro = ctx.data.astro as
          | { localImagePaths: Set<string> }
          | undefined;
        astro?.localImagePaths.add(image);

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
                    width: 1200,
                    height: 630,
                    src: image,
                  }),
                ],
              ),
            ],
          ),
        );
      },
    },
    name: `link-card-local-images-v1-${digest}`,
  });
}
