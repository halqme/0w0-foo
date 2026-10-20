import { globSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { join } from "node:path";
import ogs from "open-graph-scraper";
import type { LinkCardData } from "./link-card";
import { fetchPublicHttps } from "./public-https";

export function findBlogLinkUrls(
  directory = join(process.cwd(), "src/content/blog"),
): string[] {
  const urls = new Set<string>();
  for (const file of globSync("**/*.md", { cwd: directory })) {
    const content = readFileSync(join(directory, file), "utf-8");
    for (const match of content.matchAll(/^\s*(https?:\/\/[^\s<>]+)\s*$/gm)) {
      try {
        urls.add(new URL(match[1]).href);
      } catch {
        // Ignore malformed URLs in source text.
      }
    }
  }
  return [...urls];
}

export async function prepareLinkCards(
  urls: string[],
  directory = join(process.cwd(), ".astro/link-card-images"),
): Promise<Record<string, LinkCardData>> {
  await mkdir(directory, { recursive: true });
  const imageCache = new Map<string, Promise<string>>();
  const resolveImage = (value: string) => {
    let promise = imageCache.get(value);
    if (!promise) {
      promise = (async () => {
        const image = await fetchPublicHttps(value, {
          maxBytes: 8 * 1024 * 1024,
        });
        const metadata = await sharp(image.body, {
          limitInputPixels: 40_000_000,
        }).metadata();
        if (
          !["jpeg", "png", "webp", "gif", "avif"].includes(
            metadata.format ?? "",
          ) ||
          !metadata.width ||
          !metadata.height ||
          metadata.width * metadata.height > 40_000_000
        )
          throw new Error("Not a supported raster image");
        const hash = createHash("sha256").update(image.body).digest("hex");
        const filename = `${hash}.${metadata.format}`;
        await writeFile(join(directory, filename), image.body);
        return `/.astro/link-card-images/${filename}`;
      })();
      imageCache.set(value, promise);
    }
    return promise;
  };
  const fetchCard = async (url: string): Promise<LinkCardData> => {
    try {
      const page = await fetchPublicHttps(url, { maxBytes: 4 * 1024 * 1024 });
      if (!page.contentType.includes("text/html")) return { image: "" };
      const { result } = await ogs({ html: page.body.toString("utf-8") });
      const candidates = [
        ...(result.ogImage ?? []),
        ...(result.twitterImage ?? []),
      ];
      for (const candidate of candidates) {
        try {
          const image = new URL(candidate.url, page.url);
          const pathname = image.pathname.toLowerCase();
          if (pathname.endsWith(".svg") || pathname.includes("badge")) continue;
          return { image: await resolveImage(image.href) };
        } catch {
          // Try the next advertised image when a candidate is unavailable or unsafe.
        }
      }
    } catch {
      // External metadata must not prevent pages from building.
    }
    return { image: "" };
  };
  const queue = new Set(urls);
  const iterator = queue.values();
  const entries: [string, LinkCardData][] = [];
  await Promise.all(
    Array.from({ length: Math.min(4, queue.size) }, async () => {
      for (const url of iterator) entries.push([url, await fetchCard(url)]);
    }),
  );
  return Object.fromEntries(entries);
}
