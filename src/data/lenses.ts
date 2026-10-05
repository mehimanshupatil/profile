import type { ProjectSlug } from "./site";

export type Question = { id: string; q: string };

export type Lens = {
	slug: string;
	/** Who the Lens is for, shown in the switcher. */
	reader: string;
	/** Hero line for this reader. Emphasis only; never a claim the CV doesn't support. */
	pitch: string;
	projects: ProjectSlug[];
	questions: Question[];
};

/** Questions on the home page, with no Lens applied. */
export const defaultQuestions: Question[] = [
	{ id: "3d", q: "What has he built in 3D?" },
	{ id: "react-depth", q: "How deep is his React?" },
	{ id: "genui", q: "Has he shipped generative UI?" },
	{ id: "end-to-end", q: "Can he own a feature end to end?" },
];

export const lenses: Lens[] = [
	{
		slug: "frontend",
		reader: "Frontend hiring manager",
		pitch: "Seven years of production React, Next.js and Angular, with an obsession for the last 10% of interface quality.",
		projects: ["localkit", "mumbai-local-sim", "shillak", "mumbai-lakes"],
		questions: [
			{ id: "react-depth", q: "How deep is his React?" },
			{ id: "performance", q: "What performance work has he done?" },
			{ id: "migrations", q: "Has he led large frontend migrations?" },
		],
	},
	{
		slug: "design-systems",
		reader: "Design-system lead",
		pitch: "Builds component systems other engineers, and LLMs, can pick up without asking.",
		projects: ["localkit", "shillak", "mumbai-local-sim", "mumbai-lakes"],
		questions: [
			{ id: "component-systems", q: "What component systems has he built?" },
			{ id: "design-tools", q: "Has he worked with design tools?" },
			{ id: "genui", q: "Has he shipped generative UI?" },
		],
	},
	{
		slug: "founders",
		reader: "Startup founder",
		pitch: "Ships features end to end: the interface, the serverless backend and the pipeline that deploys them.",
		projects: ["shillak", "localkit", "mumbai-lakes", "mumbai-local-sim"],
		questions: [
			{ id: "end-to-end", q: "Can he own a feature end to end?" },
			{ id: "backend", q: "What backend work has he done?" },
			{ id: "solo", q: "What has he shipped on his own?" },
		],
	},
	{
		slug: "creative-tech",
		reader: "Creative technologist",
		pitch: "Turns real-world data into real-time 3D: Mumbai's lakes on real terrain and its trains on the real timetable.",
		projects: ["mumbai-local-sim", "mumbai-lakes", "localkit", "shillak"],
		questions: [
			{ id: "3d", q: "What has he built in 3D?" },
			{ id: "real-data", q: "How does he work with real-world data?" },
			{ id: "simulation", q: "How does the train simulation work?" },
		],
	},
];
