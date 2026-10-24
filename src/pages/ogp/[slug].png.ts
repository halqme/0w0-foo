import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import { getPublishedPosts } from "../../lib/blog";
import satori from "satori";

import { loadFavicon, loadFonts } from "../../lib/ogp";

const CACHE_DIR = join(process.cwd(), ".cache");
const IMAGE_CACHE_DIR = join(CACHE_DIR, "ogp-images");
const FAVICON_CACHE_DIR = join(CACHE_DIR, "favicon-png");

// OGP画像の定数
const OGP_TITLE_MAX_LENGTH = 60;
const SLICE_OFFSET = 1;
const SLICE_START = 0;

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }));
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(SLICE_START, maxLength - SLICE_OFFSET) + "…";
}

export const GET: APIRoute = async ({ params, props }) => {
  const slug = params.slug ?? "Blog";
  const title = props.title || "Post";

  // 開発環境: 画像キャッシュを確認
  if (import.meta.env.DEV) {
    if (!existsSync(IMAGE_CACHE_DIR)) {
      await mkdir(IMAGE_CACHE_DIR, { recursive: true });
    }
    const cachedImagePath = join(IMAGE_CACHE_DIR, `${slug}.png`);

    if (existsSync(cachedImagePath)) {
      const buffer = await readFile(cachedImagePath);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Cache-Control": "public, max-age=0",
          "Content-Type": "image/png",
        },
      });
    }
  }

  const truncatedTitle = truncateText(title, OGP_TITLE_MAX_LENGTH);
  const { regular, bold } = await loadFonts();
  const faviconPng = await loadFavicon(FAVICON_CACHE_DIR, 48);

  // PNGをBase64に変換してimageとして使う
  const faviconBase64 = Buffer.from(faviconPng).toString("base64");
  const faviconDataUrl = `data:image/png;base64,${faviconBase64}`;

  const svg = await satori(
    {
      props: {
        children: [
          {
            props: {
              children: [
                {
                  props: {
                    children: truncatedTitle,
                    style: {
                      color: "#1a1a1a",
                      fontSize: "48px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.4,
                      margin: 0,
                    },
                  },
                  type: "h1",
                },
              ],
              style: {
                alignItems: "flex-start",
                display: "flex",
                flex: 1,
                flexDirection: "column",
                justifyContent: "center",
              },
            },
            type: "div",
          },
          {
            props: {
              children: [
                {
                  props: {
                    children: [
                      {
                        props: {
                          alt: "halqme",
                          height: 48,
                          src: faviconDataUrl,
                          width: 48,
                        },
                        type: "img",
                      },
                      {
                        props: {
                          children: "halqme",
                          style: {
                            color: "#666666",
                            fontSize: "28px",
                            fontWeight: 400,
                          },
                        },
                        type: "span",
                      },
                    ],
                    style: {
                      alignItems: "center",
                      display: "flex",
                      gap: "16px",
                    },
                  },
                  type: "div",
                },
                {
                  props: {
                    children: "0w0.foo",
                    style: {
                      color: "#999999",
                      fontSize: "24px",
                      fontWeight: 400,
                    },
                  },
                  type: "span",
                },
              ],
              style: {
                alignItems: "center",
                borderTop: "3px solid #1a1a1a",
                display: "flex",
                justifyContent: "space-between",
                marginTop: "40px",
                paddingTop: "30px",
              },
            },
            type: "div",
          },
        ],
        style: {
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Noto Sans JP",
          height: "100%",
          padding: "60px",
          width: "100%",
        },
      },
      type: "div",
    },
    {
      fonts: [
        {
          data: regular,
          name: "Noto Sans JP",
          style: "normal",
          weight: 400,
        },
        {
          data: bold,
          name: "Noto Sans JP",
          style: "normal",
          weight: 700,
        },
      ],
      height: 630,
      width: 1200,
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // 開発環境: 生成した画像をキャッシュ
  if (import.meta.env.DEV && slug) {
    const cachedImagePath = join(IMAGE_CACHE_DIR, `${slug}.png`);
    await writeFile(cachedImagePath, new Uint8Array(pngBuffer));
  }

  return new Response(new Uint8Array(pngBuffer), {
    headers: {
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Type": "image/png",
    },
  });
};
