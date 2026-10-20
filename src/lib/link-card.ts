import ogs from "open-graph-scraper";

export interface LinkCardData {
  image: string;
}

export { linkCardClasses } from "../styles/link-card";

const cache = new Map<string, Promise<LinkCardData>>();

function isBadgeImageUrl(url: string): boolean {
  const pathname = new URL(url).pathname.toLowerCase();
  return pathname.endsWith(".svg") || pathname.includes("badge");
}

async function fetchLinkCardData(url: string): Promise<LinkCardData> {
  const fallback: LinkCardData = {
    image: "",
  };

  try {
    const { result } = await ogs({
      fetchOptions: {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BlogBot/1.0)" },
      },
      timeout: 5,
      url,
    });

    const image =
      [
        ...(result.ogImage ?? []).map((entry) => entry.url),
        ...(result.twitterImage ?? []).map((entry) => entry.url),
      ]
        .map((value) => new URL(value, url).href)
        .find((value) => !isBadgeImageUrl(value)) ?? "";
    return {
      image,
    };
  } catch {
    return fallback;
  }
}

export function getLinkCardData(url: string): Promise<LinkCardData> {
  let data = cache.get(url);
  if (!data) {
    data = fetchLinkCardData(url);
    cache.set(url, data);
  }
  return data;
}
