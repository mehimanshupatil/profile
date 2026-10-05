const HISTORY_URL = "https://raw.githubusercontent.com/mehimanshupatil/mumbai-lakes-sim/main/data/history.json";

const NAMES: Record<string, string> = {
	upper_vaitarna: "Upper Vaitarna",
	middle_vaitarna: "Middle Vaitarna",
	modak_sagar: "Modak Sagar",
	tansa: "Tansa",
	bhatsa: "Bhatsa",
	vehar: "Vihar",
	tulsi: "Tulsi",
};

type Report = {
	date: string;
	reportTime: string;
	totals: { liveStorageML: number; pctUseful: number; previousYears: { year: number; pctUseful: number }[] };
	lakes: Record<string, { pctUseful: number; liveStorageML: number }>;
};

export type LakeBulletin = {
	date: string;
	time: string;
	daysOld: number;
	totalPct: number;
	lastYear?: { year: number; pct: number };
	lakes: { name: string; pct: number }[];
};

let cached: Promise<LakeBulletin | null> | undefined;

/** Latest BMC lake report from the mumbai-lakes pipeline, fetched once per build. Null if unavailable. */
export function lakeBulletin(): Promise<LakeBulletin | null> {
	cached ??= load();
	return cached;
}

async function load(): Promise<LakeBulletin | null> {
	try {
		const res = await fetch(HISTORY_URL);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const history: Report[] = await res.json();
		const latest = history.at(-1);
		if (!latest) return null;
		const prev = latest.totals.previousYears[0];
		return {
			date: latest.date,
			time: latest.reportTime,
			daysOld: Math.floor((Date.now() - Date.parse(`${latest.date}T00:00:00+05:30`)) / 86_400_000),
			totalPct: latest.totals.pctUseful,
			lastYear: prev && { year: prev.year, pct: prev.pctUseful },
			lakes: Object.entries(latest.lakes)
				.map(([id, l]) => ({ name: NAMES[id] ?? id, pct: l.pctUseful }))
				.sort((a, b) => b.pct - a.pct),
		};
	} catch (err) {
		console.warn(`[lakes] Lake Bulletin unavailable: ${err instanceof Error ? err.message : err}`);
		return null;
	}
}
