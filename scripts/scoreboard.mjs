/**
 * Runs Lighthouse (mobile, 3 runs, median) against the site and every project with a live URL,
 * then appends the result to src/data/scoreboard.json. Run weekly by .github/workflows/scoreboard.yml.
 *
 *   node scripts/scoreboard.mjs            all sites
 *   node scripts/scoreboard.mjs site       only the given keys
 */
import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const OUT = "src/data/scoreboard.json";
const RUNS = 3;
const KEEP = 12;
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

async function sites() {
	const list = [{ key: "site", url: "https://himanshupatil.dev/" }];
	const dir = "src/content/projects";
	for (const file of (await readdir(dir)).filter((f) => f.endsWith(".mdx")).sort()) {
		const live = (await readFile(join(dir, file), "utf8")).match(/^live:\s*(\S+)/m)?.[1];
		if (live) list.push({ key: file.replace(/\.mdx$/, ""), url: live });
	}
	return list;
}

async function lighthouse(url) {
	const { stdout } = await run(
		"npx",
		[
			"-y",
			"lighthouse@13",
			url,
			"--quiet",
			"--output=json",
			"--output-path=stdout",
			`--only-categories=${CATEGORIES.join(",")}`,
			"--chrome-flags=--headless=new --no-sandbox",
		],
		{ maxBuffer: 64 * 1024 * 1024 },
	);
	const report = JSON.parse(stdout);
	return Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((report.categories[c]?.score ?? 0) * 100)]));
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function main() {
	const only = new Set(process.argv.slice(2));
	const targets = (await sites()).filter((s) => only.size === 0 || only.has(s.key));
	const results = {};
	for (const { key, url } of targets) {
		const runs = [];
		for (let i = 1; i <= RUNS; i++) {
			console.log(`${key}: run ${i}/${RUNS} ${url}`);
			runs.push(await lighthouse(url));
		}
		results[key] = { url, ...Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r[c]))])) };
		console.log(`${key}:`, results[key]);
	}

	let file = { runs: [] };
	try {
		file = JSON.parse(await readFile(OUT, "utf8"));
	} catch {}
	file.runs.push({ date: new Date().toISOString().slice(0, 10), results });
	file.runs = file.runs.slice(-KEEP);
	await writeFile(OUT, `${JSON.stringify(file, null, "\t")}\n`);
	console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
