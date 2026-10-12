import { getCollection, type CollectionEntry } from "astro:content";

export async function getPublishedPosts() {
  return getCollection("blog", ({ data }) => data.published);
}

export function sortPostsNewestFirst(posts: CollectionEntry<"blog">[]) {
  return posts.toSorted(
    (a, b) => b.data.published_at.valueOf() - a.data.published_at.valueOf(),
  );
}
