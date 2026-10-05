import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { createContext, useContext } from "react";
import { z } from "zod/v4";
import { projectSlugs } from "@/data/site";

export type ProjectCard = { slug: string; name: string; summary: string; live?: string };

/** Project details for the Project component; the island provides them from the content collection. */
export const ProjectsContext = createContext<Record<string, ProjectCard>>({});

const Lead = defineComponent({
	name: "Lead",
	description: "One-sentence direct answer to the question. Always the first child.",
	props: z.object({ text: z.string() }),
	component: ({ props }) => <p className="text-foreground text-xl leading-snug font-medium sm:text-2xl">{props.text}</p>,
});

const Para = defineComponent({
	name: "Para",
	description: "A short paragraph (1-3 sentences) of supporting detail.",
	props: z.object({ text: z.string() }),
	component: ({ props }) => <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">{props.text}</p>,
});

const Bullets = defineComponent({
	name: "Bullets",
	description: "Up to 5 short bullet points.",
	props: z.object({ items: z.array(z.string()) }),
	component: ({ props }) => (
		<ul className="text-muted-foreground marker:text-line list-disc space-y-1 pl-5 leading-relaxed">
			{props.items.map((item, i) => (
				<li key={i}>{item}</li>
			))}
		</ul>
	),
});

const Project = defineComponent({
	name: "Project",
	description: "Card linking to one of the owner's projects, with one sentence on why it is relevant to the question.",
	props: z.object({ slug: z.enum(projectSlugs), why: z.string() }),
	component: ({ props }) => {
		const p = useContext(ProjectsContext)[props.slug];
		if (!p) return null;
		return (
			<a
				href={`/projects/${p.slug}/`}
				className="bg-card hover:border-line group block rounded-lg border p-4 transition-colors"
			>
				<span className="font-heading group-hover:text-line text-2xl font-bold tracking-wide uppercase">{p.name}</span>
				<span className="text-muted-foreground mt-1 block text-sm">{props.why}</span>
			</a>
		);
	},
});

const Stat = defineComponent({
	name: "Stat",
	description: "A single figure taken verbatim from the facts, e.g. years of experience or number of services.",
	props: z.object({ value: z.string(), label: z.string() }),
	component: ({ props }) => (
		<div className="bg-led-bg rounded-md px-4 py-3">
			<span className="font-led text-led led-glow block text-3xl font-extrabold">{props.value}</span>
			<span className="text-muted-foreground font-mono text-xs uppercase">{props.label}</span>
		</div>
	),
});

const Stats = defineComponent({
	name: "Stats",
	description: "Row of 2-4 Stat figures.",
	props: z.object({ items: z.array(Stat.ref) }),
	component: ({ props, renderNode }) => <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{renderNode(props.items)}</div>,
});

const Stop = defineComponent({
	name: "Stop",
	description: "One dated entry in a Timeline.",
	props: z.object({ when: z.string(), title: z.string(), detail: z.string().optional() }),
	component: ({ props }) => (
		<li className="relative pl-6">
			<span className="bg-background border-line absolute top-1.5 left-0 size-3 rounded-full border-[3px]" />
			<time className="text-muted-foreground font-mono text-xs">{props.when}</time>
			<p className="font-semibold">{props.title}</p>
			{props.detail && <p className="text-muted-foreground text-sm">{props.detail}</p>}
		</li>
	),
});

const Timeline = defineComponent({
	name: "Timeline",
	description: "Chronological list of 2-5 Stop entries, oldest first.",
	props: z.object({ stops: z.array(Stop.ref) }),
	component: ({ props, renderNode }) => (
		<ol className="border-line/40 ml-1.5 space-y-4 border-l-2 py-1 [&>li]:-ml-[7px]">{renderNode(props.stops)}</ol>
	),
});

const Tags = defineComponent({
	name: "Tags",
	description: "Technologies or skills as small tags. Only names that appear in the facts.",
	props: z.object({ items: z.array(z.string()) }),
	component: ({ props }) => (
		<div className="flex flex-wrap gap-2">
			{props.items.map((t, i) => (
				<span key={i} className="bg-muted rounded-full px-3 py-1 font-mono text-xs">
					{t}
				</span>
			))}
		</div>
	),
});

const Answer = defineComponent({
	name: "Answer",
	description: "Root of every answer. Starts with a Lead, then 2-4 supporting blocks.",
	props: z.object({
		blocks: z.array(z.union([Lead.ref, Para.ref, Bullets.ref, Project.ref, Stats.ref, Timeline.ref, Tags.ref])),
	}),
	component: ({ props, renderNode }) => <div className="space-y-5">{renderNode(props.blocks)}</div>,
});

export const library = createLibrary({
	root: "Answer",
	components: [Answer, Lead, Para, Bullets, Project, Stats, Stat, Timeline, Stop, Tags],
});

export const rootName = "Answer";
