import { CrosshairIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Box = { name: string; x: number; y: number; w: number; h: number };
type Spec = Box & {
	pad: number[];
	font: string;
	type: string;
	color: string;
	bg: string;
};

function boxOf(el: HTMLElement): Box {
	const r = el.getBoundingClientRect();
	return { name: el.dataset.c!, x: r.left, y: r.top, w: r.width, h: r.height };
}

function specOf(el: HTMLElement): Spec {
	const cs = getComputedStyle(el);
	const text = el.querySelector<HTMLElement>("h1,h2,h3,p,span,b,a") ?? el;
	const ts = getComputedStyle(text);
	const lh = ts.lineHeight === "normal" ? "normal" : String(Math.round(parseFloat(ts.lineHeight)));
	return {
		...boxOf(el),
		pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat),
		font: `${ts.fontFamily.split(",")[0].replaceAll('"', "")} ${ts.fontWeight}`,
		type: `${parseFloat(ts.fontSize)}/${lh}`,
		color: ts.color,
		bg: cs.backgroundColor,
	};
}

/** Overlays component outlines, padding and type/colour specs on the live page. Toggle with I. */
export default function InspectMode() {
	const [on, setOn] = useState(false);
	const [boxes, setBoxes] = useState<Box[]>([]);
	const [spec, setSpec] = useState<Spec | null>(null);

	const measure = useCallback(() => {
		const els = [...document.querySelectorAll<HTMLElement>("[data-c]")];
		setBoxes(
			els
				.filter((el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed")
				.map(boxOf)
				.filter((b) => b.w > 0 && b.y + b.h > 0 && b.y < innerHeight),
		);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.target as HTMLElement).closest("input,textarea,[contenteditable]")) return;
			if (e.key.toLowerCase() === "i" && !e.metaKey && !e.ctrlKey && !e.altKey) setOn((v) => !v);
			if (e.key === "Escape") setOn(false);
		};
		addEventListener("keydown", onKey);
		return () => removeEventListener("keydown", onKey);
	}, []);

	useEffect(() => {
		document.documentElement.toggleAttribute("data-inspecting", on);
		if (!on) {
			setBoxes([]);
			setSpec(null);
			return;
		}
		measure();
		const onMove = (e: PointerEvent) => {
			const el = (e.target as HTMLElement).closest<HTMLElement>("[data-c]");
			setSpec(el ? specOf(el) : null);
		};
		const onScroll = () => {
			measure();
			setSpec(null);
		};
		addEventListener("scroll", onScroll, { passive: true, capture: true });
		addEventListener("resize", measure);
		document.addEventListener("pointermove", onMove);
		return () => {
			removeEventListener("scroll", onScroll, { capture: true });
			removeEventListener("resize", measure);
			document.removeEventListener("pointermove", onMove);
		};
	}, [on, measure]);

	const tipTop = spec && (spec.y + spec.h + 196 > innerHeight ? Math.max(8, spec.y - 196) : spec.y + spec.h + 8);
	const tipLeft = spec && Math.min(innerWidth - 300, Math.max(8, spec.x));

	return (
		<>
			<Button
				variant={on ? "default" : "outline"}
				size="sm"
				onClick={() => setOn((v) => !v)}
				aria-pressed={on}
				className="fixed right-4 bottom-4 z-50 hidden rounded-full sm:inline-flex font-mono shadow-sm backdrop-blur"
			>
				<CrosshairIcon weight="bold" />
				Inspect
				<kbd className="rounded border border-current px-1 text-[0.65rem] opacity-70">I</kbd>
			</Button>

			{on && (
				<div className="pointer-events-none fixed inset-0 z-40" aria-hidden="true">
					{boxes.map((b, i) => (
						<div
							key={i}
							className="fixed outline-1 -outline-offset-1 outline-fuchsia-500 outline-dashed"
							style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
						>
							<span className="absolute top-0 left-0 -translate-y-full rounded-t-sm bg-fuchsia-500 px-1.5 py-0.5 font-mono text-[10px] leading-none font-semibold whitespace-nowrap text-white">
								{b.name} <span className="opacity-75">{Math.round(b.w)}×{Math.round(b.h)}</span>
							</span>
						</div>
					))}
					{spec && (
						<>
							<div
								className="fixed box-border border-solid border-emerald-400/35 bg-sky-400/10"
								style={{ left: spec.x, top: spec.y, width: spec.w, height: spec.h, borderWidth: spec.pad.map((p) => `${p}px`).join(" ") }}
							/>
							<dl
								className="fixed grid w-72 grid-cols-[4rem_1fr] rounded-lg bg-zinc-900 px-3 py-2.5 font-mono text-xs leading-relaxed text-zinc-100 shadow-xl"
								style={{ left: tipLeft!, top: tipTop! }}
							>
								<dt className="col-span-2 font-semibold text-fuchsia-300">&lt;{spec.name}&gt;</dt>
								{(
									[
										["size", `${Math.round(spec.w)} × ${Math.round(spec.h)}`],
										["padding", spec.pad.join(" ")],
										["font", spec.font],
										["type", spec.type],
										["color", spec.color],
										["bg", spec.bg],
									] as const
								).map(([k, v]) => (
									<div key={k} className="contents">
										<dt className="text-zinc-400">{k}</dt>
										<dd className="flex items-center gap-1.5 truncate">
											{(k === "color" || k === "bg") && (
												<i className="inline-block size-2.5 shrink-0 rounded-sm border border-white/30" style={{ background: v }} />
											)}
											{v}
										</dd>
									</div>
								))}
							</dl>
						</>
					)}
				</div>
			)}
		</>
	);
}
