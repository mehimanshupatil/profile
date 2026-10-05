import { ArrowRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import AnswerBlocks, { type ProjectCard } from "@/components/AnswerBlocks";
import type { Answer } from "@/data/answers";

type Props = {
	questions: { id: string; q: string }[];
	answers: Record<string, Answer>;
	projects: Record<string, ProjectCard>;
};

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FLAP_MS = 14; // per character settling on the board
const TYPE_MS = 12; // per character of the lead
const BLOCK_MS = 220; // between supporting blocks

/** Departure-board enquiry: the question flaps in, the lead types out, then each block arrives. */
export default function AskMe({ questions, answers, projects }: Props) {
	const available = questions.filter((q) => answers[q.id]);
	const [active, setActive] = useState<string | null>(null);
	const [board, setBoard] = useState("SELECT AN ENQUIRY");
	const [lead, setLead] = useState("");
	const [revealed, setRevealed] = useState(0);
	const [playing, setPlaying] = useState(false);
	const raf = useRef(0);

	useEffect(() => () => cancelAnimationFrame(raf.current), []);

	function ask(id: string) {
		cancelAnimationFrame(raf.current);
		const target = available.find((q) => q.id === id)!.q.toUpperCase();
		const answer = answers[id];
		setActive(id);

		if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setBoard(target);
			setLead(answer.lead);
			setRevealed(answer.blocks.length);
			setPlaying(false);
			return;
		}

		const start = performance.now();
		const leadStart = target.length * FLAP_MS;
		const blocksStart = leadStart + answer.lead.length * TYPE_MS;
		setPlaying(true);
		const frame = (now: number) => {
			const t = now - start;
			const settled = Math.floor(t / FLAP_MS);
			let text = "";
			for (let i = 0; i < target.length; i++) {
				const c = target[i];
				if (i < settled || c === " ") text += c;
				else if (i < settled + 6) text += GLYPHS[(Math.random() * GLYPHS.length) | 0];
			}
			setBoard(text);
			setLead(answer.lead.slice(0, Math.max(0, Math.floor((t - leadStart) / TYPE_MS))));
			const blocks = t < blocksStart ? 0 : Math.min(answer.blocks.length, 1 + Math.floor((t - blocksStart) / BLOCK_MS));
			setRevealed(blocks);
			if (blocks < answer.blocks.length || t < blocksStart) raf.current = requestAnimationFrame(frame);
			else setPlaying(false);
		};
		raf.current = requestAnimationFrame(frame);
	}

	return (
		<div className="grid gap-6 md:grid-cols-[minmax(14rem,1fr)_2fr]" data-c="AskMe">
			<div className="flex flex-col gap-2">
				<p className="text-muted-foreground font-mono text-xs font-semibold tracking-widest">
					ENQUIRY · <span className="font-deva">पूछताछ · चौकशी</span>
				</p>
				{available.map((q, i) => (
					<button
						key={q.id}
						type="button"
						onClick={() => ask(q.id)}
						aria-pressed={active === q.id}
						className="bg-card hover:border-line aria-pressed:border-line group flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors"
					>
						<span className="font-led text-line text-lg font-extrabold">{String(i + 1).padStart(2, "0")}</span>
						<span className="flex-1">{q.q}</span>
						<ArrowRightIcon className="text-muted-foreground group-hover:text-line size-4 shrink-0" />
					</button>
				))}
			</div>

			<div className="min-w-0">
				<div className="bg-led-bg border-led-frame rounded-xl border-[6px] px-5 py-4" aria-hidden="true">
					<p className="font-led text-led led-glow min-h-[1.5em] text-lg leading-snug font-extrabold sm:text-xl">{board}</p>
				</div>
				<div className="mt-5 min-h-48" aria-live="polite" aria-busy={playing}>
					{active && <AnswerBlocks answer={answers[active]} lead={lead} revealed={revealed} projects={projects} />}
				</div>
			</div>
		</div>
	);
}
