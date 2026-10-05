import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
	loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/projects" }),
	schema: ({ image }) =>
		z.object({
			name: z.string(),
			summary: z.string(),
			stack: z.array(z.string()),
			order: z.number(),
			featured: z.boolean().default(false),
			live: z.string().url().optional(),
			repo: z.string().url().optional(),
			article: z.string().url().optional(),
			cover: image().optional(),
			coverAlt: z.string().optional(),
		}),
});

const posts = defineCollection({
	loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		draft: z.boolean().default(false),
	}),
});

export const collections = { projects, posts };
