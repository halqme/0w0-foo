import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
  schema: z.object({
    emoji: z.string(),
    published: z.boolean(),
    published_at: z.coerce.date(),
    title: z.string(),
    topics: z
      .array(
        z
          .string()
          .regex(/^\S+$/)
          .transform((topic) => topic.toLowerCase()),
      )
      .max(5),
    type: z.enum(["tech", "idea"]),
    zenn_slug: z
      .string()
      .regex(/^[a-z0-9_-]{12,50}$/)
      .optional(),
  }),
});

export const collections = { blog };
