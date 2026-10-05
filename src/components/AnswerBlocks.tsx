import type { Answer, Block } from "@/data/answers";

export type ProjectCard = { slug: string; name: string; summary: string };

function BlockView({ block, projects }: { block: Block; projects: Record<string, ProjectCard> }) {
	switch (block.type) {
		case "para":
			return <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">{block.text}</p>;
		case "bullets":
			return (
				<ul className="text-muted-foreground marker:text-line list-disc space-y-1 pl-5 leading-relaxed">
					{block.items.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			);
		case "project": {
			const p = projects[block.slug];
			if (!p) return null;
			return (
				<a href={`/projects/${p.slug}/`} className="bg-card hover:border-line group block rounded-lg border p-4 transition-colors">
					<span className="font-heading group-hover:text-line text-2xl font-bold tracking-wide uppercase">{p.name}</span>
					<span className="text-muted-foreground mt-1 block text-sm">{block.why}</span>
				</a>
			);
		}
		case "stats":
			return (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{block.items.map((s) => (
						<div key={s.label} className="bg-led-bg rounded-md px-4 py-3">
							<span className="font-led text-led led-glow block text-3xl font-extrabold">{s.value}</span>
							<span className="text-muted-foreground font-mono text-xs uppercase">{s.label}</span>
						</div>
					))}
				</div>
			);
		case "timeline":
			return (
				<ol className="border-line/40 ml-1.5 space-y-4 border-l-2 py-1">
					{block.stops.map((s) => (
						<li key={s.title} className="relative -ml-[7px] pl-6">
							<span className="bg-background border-line absolute top-1.5 left-0 size-3 rounded-full border-[3px]" />
							<time className="text-muted-foreground font-mono text-xs">{s.when}</time>
							<p className="font-semibold">{s.title}</p>
							{s.detail && <p className="text-muted-foreground text-sm">{s.detail}</p>}
						</li>
					))}
				</ol>
			);
		case "tags":
			return (
				<div className="flex flex-wrap gap-2">
					{block.items.map((t) => (
						<span key={t} className="bg-muted rounded-full px-3 py-1 font-mono text-xs">
							{t}
						</span>
					))}
				</div>
			);
	}
}

/**
 * Renders an Answer. `lead` may be a partial string while the replay types it out;
 * `revealed` is how many blocks have arrived so far.
 */
export default function AnswerBlocks({
	answer,
	lead,
	revealed,
	projects,
}: {
	answer: Answer;
	lead: string;
	revealed: number;
	projects: Record<string, ProjectCard>;
}) {
	return (
		<div className="space-y-5">
			<p className="text-foreground text-xl leading-snug font-medium sm:text-2xl">{lead}</p>
			{answer.blocks.slice(0, revealed).map((b, i) => (
				<div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
					<BlockView block={b} projects={projects} />
				</div>
			))}
		</div>
	);
}
