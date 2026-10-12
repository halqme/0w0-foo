import { defineHastPlugin } from "satteri";
import type { Element, ElementContent, Properties } from "hast";
import ogs from "open-graph-scraper";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface OgpData {
  description: string;
  favicon: string;
  image: string;
  title: string;
}

const ogpCache = new Map<string, OgpData>();

function isBadgeImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();
    return pathname.endsWith(".svg") || pathname.includes("badge");
  } catch {
    return false;
  }
}

function resolveUrl(value: string, baseUrl: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return new URL(value, baseUrl).href;
}

function createText(value: string): ElementContent {
  return { type: "text", value };
}

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

async function fetchOgp(url: string): Promise<OgpData | null> {
  try {
    const { result } = await ogs({
      fetchOptions: {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BlogBot/1.0)" },
      },
      timeout: 5,
      url,
    });

    const parsedUrl = new URL(url);
    const imageCandidate =
      [
        ...(result.ogImage ?? []).map((entry) => entry.url),
        ...(result.twitterImage ?? []).map((entry) => entry.url),
      ].find((imageUrl) => !isBadgeImageUrl(imageUrl)) ?? "";
    const title = result.ogTitle ?? result.twitterTitle ?? parsedUrl.hostname;
    const description = result.ogDescription ?? result.twitterDescription ?? "";
    const favicon =
      result.favicon ??
      `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`;

    return {
      description,
      favicon,
      image: imageCandidate,
      title,
    };
  } catch {
    return null;
  }
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
    const data = await fetchOgp(url);
    if (data) ogpCache.set(url, data);
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

      const ogp = ogpCache.get(href);
      const displayUrl = new URL(href).hostname;
      const title = ogp?.title || displayUrl;
      const description = ogp?.description || "";
      const favicon = ogp?.favicon ? resolveUrl(ogp.favicon, href) : "";
      const image = ogp?.image ? resolveUrl(ogp.image, href) : "";

      const infoChildren: ElementContent[] = [
        createElement(
          "span",
          {
            className: [
              "font-sans text-lg font-semibold leading-relaxed text-ink line-clamp-2 mb-1",
            ],
          },
          [createText(title)],
        ),
      ];

      if (description) {
        infoChildren.push(
          createElement(
            "span",
            {
              className: [
                "text-sm leading-relaxed text-muted line-clamp-2 mb-3",
              ],
            },
            [createText(description)],
          ),
        );
      }

      const urlContainerChildren: ElementContent[] = [];
      if (favicon) {
        urlContainerChildren.push(
          createElement("img", {
            alt: `${title} favicon`,
            className: ["icon-sm rounded-xs"],
            height: 16,
            src: favicon,
            width: 16,
          }),
        );
      }
      urlContainerChildren.push(
        createElement("span", { className: ["truncate"] }, [
          createText(displayUrl),
        ]),
      );

      infoChildren.push(
        createElement(
          "span",
          {
            className: ["flex items-center gap-1.5 text-xs text-muted"],
          },
          urlContainerChildren,
        ),
      );

      const cardChildren: ElementContent[] = [];
      if (image) {
        cardChildren.push(
          createElement(
            "span",
            {
              className: [
                "relative aspect-[1200/630] overflow-hidden bg-surface-muted",
              ],
            },
            [
              createElement("img", {
                alt: title,
                className: [
                  "absolute inset-0 block h-full w-full object-cover outline outline-1 outline-offset-[-1px] outline-[var(--color-image-outline)]",
                ],
                src: image,
              }),
            ],
          ),
        );
      }
      cardChildren.push(
        createElement("span", { className: ["p-5"] }, infoChildren),
      );

      ctx.replaceNode(
        node,
        createElement(
          "a",
          {
            className: [
              "flex flex-col overflow-hidden rounded-xs border border-line bg-surface text-ink no-underline transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-ink hover:shadow-[2px_2px_0_var(--color-line)] focused motion-reduce:transform-none",
            ],
            href,
          },
          cardChildren,
        ),
      );
    },
  },
  name: "link-card",
});
