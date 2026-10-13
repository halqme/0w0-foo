import { describe, expect, it } from "vite-plus/test";
import { slugifyTag } from "./tag";

describe("slugifyTag", () => {
  it("normalizes NFKC and lowercases fullwidth input before trimming", () => {
    expect(slugifyTag("  ＦＯＯ　ＢＡＲ  ")).toBe("foo-bar");
  });

  it("preserves Japanese letters and numbers", () => {
    expect(slugifyTag("  日本語 123 ")).toBe("日本語-123");
  });

  it("collapses separators into one hyphen and trims edge separators", () => {
    expect(slugifyTag(" --Hello___world... ")).toBe("hello-world");
  });

  it("encodes normalized punctuation when no letters or numbers remain", () => {
    expect(slugifyTag("  ＋＆  ")).toBe("%2B%26");
  });

  it("returns an empty string for empty input", () => {
    expect(slugifyTag(" ")).toBe("");
  });
});
