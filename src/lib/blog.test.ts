import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { getCollection } = vi.hoisted(() => ({ getCollection: vi.fn() }));
vi.mock("astro:content", () => ({ getCollection }));

import { getPublishedPosts, sortPostsNewestFirst } from "./blog";
import type { CollectionEntry } from "astro:content";

type BlogPost = CollectionEntry<"blog">;

function post(id: string, publishedAt: string, published = true): BlogPost {
  return {
    id,
    collection: "blog",
    data: {
      emoji: "✦",
      published,
      published_at: new Date(publishedAt),
      title: id,
      topics: [],
      type: "tech",
    },
    body: "",
    filePath: `${id}.md`,
    rendered: undefined,
  };
}

beforeEach(() => {
  getCollection.mockReset();
});

describe("getPublishedPosts", () => {
  it("passes and applies the published filter", async () => {
    const visible = post("visible", "2025-01-01");
    getCollection.mockImplementation(
      async (_name, filter: (entry: BlogPost) => boolean) => {
        const entries = [visible, post("draft", "2025-01-02", false)];
        return entries.filter(filter);
      },
    );

    await expect(getPublishedPosts()).resolves.toEqual([visible]);
    expect(getCollection).toHaveBeenCalledWith("blog", expect.any(Function));
  });
});

describe("sortPostsNewestFirst", () => {
  it("sorts newest first, retains equal-date order, and leaves input unchanged", () => {
    const first = post("equal-first", "2025-02-01");
    const older = post("older", "2025-01-01");
    const newest = post("newest", "2025-03-01");
    const second = post("equal-second", "2025-02-01");
    const input = [first, older, newest, second];
    const snapshot = [...input];

    expect(sortPostsNewestFirst(input)).toEqual([newest, first, second, older]);
    expect(input).toEqual(snapshot);
  });

  it("returns an empty list for no posts", () => {
    expect(sortPostsNewestFirst([])).toEqual([]);
  });
});
