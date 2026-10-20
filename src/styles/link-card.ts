export const linkCardClasses = {
  card: "flex flex-col overflow-hidden text-ink no-underline focused",
  imageContainer: "relative aspect-[1200/630] overflow-hidden bg-surface-muted",
  image:
    "absolute inset-0 block h-full w-full object-cover outline outline-1 outline-offset-[-1px] outline-[var(--color-image-outline)]",
  info: "py-4",
  title:
    "font-sans text-base font-normal leading-relaxed text-ink underline underline-offset-4 line-clamp-2 mb-1",
  description: "text-sm leading-relaxed text-muted line-clamp-2 mb-3",
  host: "flex items-center gap-1.5 text-xs text-muted",
  favicon: "icon-sm rounded-xs",
  displayUrl: "truncate",
} as const;
