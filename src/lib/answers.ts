import { getCollection } from "astro:content";
import type { ProjectCard } from "@/components/AnswerBlocks";

export async function projectCards(): Promise<Record<string, ProjectCard>> {
	const projects = await getCollection("projects");
	return Object.fromEntries(projects.map((p) => [p.id, { slug: p.id, name: p.data.name, summary: p.data.summary }]));
}
