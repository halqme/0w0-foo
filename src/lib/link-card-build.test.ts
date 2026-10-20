import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("./public-https", () => ({ fetchPublicHttps: mocks.fetch }));
import { findBlogLinkUrls, prepareLinkCards } from "./link-card-build";

const page = "https://example.com/article";
const image = "https://cdn.example.com/hero.png?v=1";
const html = (tags: string, url = page) => ({
  url,
  body: Buffer.from(`<html><head>${tags}</head></html>`),
  contentType: "text/html",
});
let directory: string;
let bytes: Buffer;
const imageResponse = () => ({
  url: image,
  body: bytes,
  contentType: "image/png",
});

beforeEach(async () => {
  mocks.fetch.mockReset();
  directory = mkdtempSync(join(tmpdir(), "link-cards-"));
  bytes = await sharp({
    create: { width: 2, height: 1, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe("link card preparation", () => {
  it("resolves against the final page URL and stores validated image bytes for local Astro imports", async () => {
    mocks.fetch.mockImplementation(async (url: string) => {
      if (url === page)
        return html(
          '<meta property="og:image" content="../hero.png">',
          "https://example.com/docs/article",
        );
      if (url === "https://example.com/hero.png") return imageResponse();
      throw new Error("unexpected URL");
    });
    const cards = await prepareLinkCards([page, page], directory);
    expect(cards[page].image).toMatch(
      /^\/\.astro\/link-card-images\/[a-f0-9]{64}\.png$/,
    );
    expect(readFileSync(join(directory, basename(cards[page].image)))).toEqual(
      bytes,
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("tries Twitter images after badges, malformed and unavailable OG images", async () => {
    mocks.fetch.mockResolvedValueOnce(
      html(`
      <meta property="og:image" content="/badge.svg">
      <meta property="og:image" content="https://[invalid">
      <meta property="og:image" content="/missing.png">
      <meta name="twitter:image" content="${image}">
    `),
    );
    mocks.fetch.mockRejectedValueOnce(new Error("offline"));
    mocks.fetch.mockResolvedValueOnce(imageResponse());
    const cards = await prepareLinkCards([page], directory);
    expect(cards[page].image).toMatch(/\.png$/);
    expect(mocks.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("badge"),
      expect.anything(),
    );
  });

  it.each(["failure", "empty", "unsafe", "svg", "invalid"])(
    "returns no image and writes no file for %s responses",
    async (kind) => {
      if (kind === "failure")
        mocks.fetch.mockRejectedValue(new Error("offline"));
      else {
        mocks.fetch.mockResolvedValueOnce(
          html(
            kind === "empty"
              ? ""
              : `<meta property="og:image" content="${image}">`,
          ),
        );
        if (kind === "unsafe")
          mocks.fetch.mockRejectedValueOnce(new Error("private address"));
        if (kind === "svg")
          mocks.fetch.mockResolvedValueOnce({
            ...imageResponse(),
            body: Buffer.from(
              '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>',
            ),
          });
        if (kind === "invalid")
          mocks.fetch.mockResolvedValueOnce({
            ...imageResponse(),
            body: Buffer.from("not an image"),
          });
      }
      expect(await prepareLinkCards([page], directory)).toEqual({
        [page]: { image: "" },
      });
      expect(readdirSync(directory)).toEqual([]);
    },
  );

  it.each([
    { sizeMiB: 3, accepted: true },
    { sizeMiB: 5, accepted: false },
  ])(
    "handles $sizeMiB MiB HTML with a bounded metadata download",
    async ({ sizeMiB, accepted }) => {
      const response = html(
        `${" ".repeat(sizeMiB * 1024 * 1024)}<meta property="og:image" content="${image}">`,
      );
      mocks.fetch.mockImplementation(
        async (url: string, options?: { maxBytes?: number }) => {
          if (url === image) return imageResponse();
          if (response.body.length > (options?.maxBytes ?? 2 * 1024 * 1024))
            throw new Error("HTTPS response exceeds maxBytes");
          return response;
        },
      );
      const cards = await prepareLinkCards([page], directory);
      if (accepted) {
        expect(cards[page].image).toMatch(/\.png$/);
        expect(
          readFileSync(join(directory, basename(cards[page].image))),
        ).toEqual(bytes);
      } else {
        expect(cards[page]).toEqual({ image: "" });
        expect(readdirSync(directory)).toEqual([]);
      }
    },
  );

  it("shares image downloads across distinct cards", async () => {
    mocks.fetch.mockImplementation(async (url: string) =>
      url === image
        ? imageResponse()
        : html(`<meta property="og:image" content="${image}">`, url),
    );
    const cards = await prepareLinkCards([page, `${page}/two`], directory);
    expect(cards[page].image).toBe(cards[`${page}/two`].image);
    expect(readdirSync(directory)).toHaveLength(1);
    expect(
      mocks.fetch.mock.calls.filter(([url]) => url === image),
    ).toHaveLength(1);
  });
});

it("collects standalone blog URLs recursively without named and inline links", () => {
  mkdirSync(join(directory, "nested"));
  writeFileSync(
    join(directory, "one.md"),
    `${page}\n\n[Named](https://named.example.com)\ntext https://inline.example.com\n\nhttps://[invalid\n`,
  );
  writeFileSync(
    join(directory, "nested/two.md"),
    `${page}\n\nhttps://other.example.com\n`,
  );
  expect(findBlogLinkUrls(directory).toSorted()).toEqual([
    page,
    "https://other.example.com/",
  ]);
});
