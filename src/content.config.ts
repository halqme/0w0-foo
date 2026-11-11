import { file, glob } from "astro/loaders";
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

const works = defineCollection({
  loader: glob({ base: "./src/content/works", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    repo: z.url(),
    url: z.url().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const tools = defineCollection({
  loader: file("src/content/tools.yaml"),
  schema: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      url: z.url(),
      comments: z.array(z.string()).default([]),
    })
    .strip(),
});

const things = defineCollection({
  loader: file("src/content/things.yaml"),
  schema: ({ image }) =>
    z
      .object({
        id: z.string(),
        title: z.string(),
        maker: z.string(),
        category: z.string(),
        image: image(),
        source: z.url(),
        description: z.array(z.string()).default([]),
      })
      .strip(),
});

export const collections = { blog, works, things, tools };
