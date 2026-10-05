import { ArrowRightIcon } from "@phosphor-icons/react";
import { Renderer } from "@openuidev/react-lang";
import { useEffect, useRef, useState } from "react";
import { type ProjectCard, ProjectsContext, library } from "@/openui/library";

type Props = {
	questions: { id: string; q: string }[];
	answers: Record<string, string>;
	projects: Record<string, ProjectCard>;
};

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function prefersReducedMotion() {
	return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Departure-board enquiry: the question flaps in, then the stored Answer replays as if streaming. */
export default function AskMe({ questions, answers, projects }: Props) {
	const available = questions.filter((q) => answers[q.id]);
	const [active, setActive] = useState<string | null>(null);
	const [board, setBoard] = useState("SELECT AN ENQUIRY");
	const [shown, setShown] = useState("");
	const [streaming, setStreaming] = useState(false);
	const raf = useRef(0);

	useEffect(() => () => cancelAnimationFrame(raf.current), []);

	function ask(id: string) {
		cancelAnimationFrame(raf.current);
		const question = available.find((q) => q.id === id)!;
		const code = answers[id];
		setActive(id);

		if (prefersReducedMotion()) {
			setBoard(question.q.toUpperCase());
			setShown(code);
			setStreaming(false);
			return;
		}

		const target = question.q.toUpperCase();
		const start = performance.now();
		setShown("");
		setStreaming(true);
		const frame = (now: number) => {
			const t = now - start;
			const settled = Math.floor(t / 14);
			let text = "";
			for (let i = 0; i < target.length; i++) {
				const c = target[i];
				if (i < settled || c === " ") text += c;
				else if (i < settled + 6) text += GLYPHS[(Math.random() * GLYPHS.length) | 0];
			}
			setBoard(text);
			// The Answer starts streaming once the question has settled on the board.
			const streamStart = target.length * 14;
			const chars = t > streamStart ? Math.floor((t - streamStart) / 3) : 0;
			setShown(code.slice(0, chars));
			if (chars < code.length) raf.current = requestAnimationFrame(frame);
			else setStreaming(false);
		};
		raf.current = requestAnimationFrame(frame);
	}

	if (available.length === 0) {
		return <p className="text-muted-foreground font-mono text-sm">Answers for these questions are being generated.</p>;
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
				<div className="mt-5 min-h-48" aria-live="polite" aria-busy={streaming}>
					{active && (
						<ProjectsContext.Provider value={projects}>
							<Renderer response={shown} library={library} isStreaming={streaming} />
						</ProjectsContext.Provider>
					)}
				</div>
			</div>
		</div>
	);
}
