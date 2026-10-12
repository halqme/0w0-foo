import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Resvg } from "@resvg/resvg-js";

const FONT_CACHE_DIR = join(process.cwd(), ".cache", "ogp-fonts");
const REGULAR_FONT_PATH = join(FONT_CACHE_DIR, "noto-sans-jp-400.woff");
const BOLD_FONT_PATH = join(FONT_CACHE_DIR, "noto-sans-jp-700.woff");
const FAVICON_PATH = join(process.cwd(), "public", "favicon.svg");

async function loadFont(path: string, url: string): Promise<ArrayBuffer> {
  if (existsSync(path)) {
    const buffer = await readFile(path);
    return new Uint8Array(buffer).buffer;
  }

  await mkdir(FONT_CACHE_DIR, { recursive: true });
  const response = await fetch(url);
  const font = await response.arrayBuffer();
  await writeFile(path, new Uint8Array(font));
  return font;
}

export async function loadBoldFont(): Promise<ArrayBuffer> {
  return loadFont(
    BOLD_FONT_PATH,
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.0/files/noto-sans-jp-japanese-700-normal.woff",
  );
}

export async function loadFonts() {
  const regular = await loadFont(
    REGULAR_FONT_PATH,
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.0/files/noto-sans-jp-japanese-400-normal.woff",
  );
  const bold = await loadBoldFont();
  return { bold, regular };
}

export async function loadFavicon(
  cacheDir: string,
  size: number,
): Promise<Uint8Array> {
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true });
  }

  const cachedPath = join(cacheDir, `favicon-${size}.png`);
  if (existsSync(cachedPath)) {
    const buffer = await readFile(cachedPath);
    return new Uint8Array(buffer);
  }

  const svgContent = existsSync(FAVICON_PATH)
    ? await readFile(FAVICON_PATH, "utf8")
    : `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#1a1a1a"/>
      <text x="200" y="280" font-size="200" font-weight="bold" fill="white" text-anchor="middle">H</text>
    </svg>`;
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: "width",
      value: size,
    },
  });
  const pngBuffer = resvg.render().asPng();
  await writeFile(cachedPath, new Uint8Array(pngBuffer));
  return new Uint8Array(pngBuffer);
}
