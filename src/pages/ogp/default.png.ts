import { join } from "node:path";

import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori from "satori";

import { loadBoldFont, loadFavicon } from "../../lib/ogp";

const FAVICON_CACHE_DIR = join(process.cwd(), "dist", ".cache", "favicon-png");
export const GET: APIRoute = async () => {
  const bold = await loadBoldFont();
  const faviconPng = await loadFavicon(FAVICON_CACHE_DIR, 120);

  // PNGをBase64に変換してimageとして使う
  const faviconBase64 = Buffer.from(faviconPng).toString("base64");
  const faviconDataUrl = `data:image/png;base64,${faviconBase64}`;

  const svg = await satori(
    {
      props: {
        children: [
          {
            props: {
              alt: "HALQME",
              height: 120,
              src: faviconDataUrl,
              style: {
                marginBottom: "40px",
              },
              width: 120,
            },
            type: "img",
          },
          {
            props: {
              children: "HALQME",
              style: {
                color: "#ffffff",
                fontSize: "72px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: 0,
              },
            },
            type: "h1",
          },
          {
            props: {
              children: "Portfolio & Blog",
              style: {
                color: "#999999",
                fontSize: "32px",
                marginBottom: 0,
                marginTop: "20px",
              },
            },
            type: "p",
          },
          {
            props: {
              children: "0w0.foo",
              style: {
                bottom: "40px",
                color: "#666666",
                fontSize: "24px",
                position: "absolute",
              },
            },
            type: "div",
          },
        ],
        style: {
          alignItems: "center",
          backgroundColor: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Noto Sans JP",
          height: "100%",
          justifyContent: "center",
          padding: "60px",
          width: "100%",
        },
      },
      type: "div",
    },
    {
      fonts: [
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

  return new Response(new Uint8Array(pngBuffer), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/png",
    },
  });
};
