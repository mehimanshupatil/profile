import { getCollection } from "astro:content";
import answersFile from "@/generated/answers.json";
import type { ProjectCard } from "@/openui/library";

type Entry = { intro?: string; answers: Record<string, string> };

const stored = answersFile.lenses as Record<string, Entry>;

/**
 * Stored Answers for a Lens ("default" = home page). A Lens question without its own Answer
 * falls back to the home page's Answer to the same question; anything else is not offered.
 */
export function answersFor(lens: string): Entry {
	const own = stored[lens] ?? { answers: {} };
	if (lens === "default") return own;
	return { ...own, answers: { ...stored.default?.answers, ...own.answers } };
}

export async function projectCards(): Promise<Record<string, ProjectCard>> {
	const projects = await getCollection("projects");
	return Object.fromEntries(
		projects.map((p) => [p.id, { slug: p.id, name: p.data.name, summary: p.data.summary, live: p.data.live }]),
	);
}
