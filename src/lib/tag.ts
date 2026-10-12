export function slugifyTag(tag: string): string {
  const normalized = tag.normalize("NFKC").toLowerCase().trim();
  const slug = normalized
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || encodeURIComponent(normalized);
}
