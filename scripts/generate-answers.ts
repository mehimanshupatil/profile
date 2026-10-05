/**
 * Generates Answers (and Lens intros) with OpenUI Cloud and writes src/generated/answers.json.
 * Runs in the scheduled workflow; the site itself never calls an LLM (docs/adr/0001).
 *
 *   pnpm generate:answers           regenerate only if the inputs changed
 *   pnpm generate:answers --force   regenerate everything
 *   pnpm generate:answers --check   validate the committed file, no API calls
 */
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createParser, generateSystemPrompt } from "@openuidev/lang-core";
import OpenAI from "openai";
import { defaultQuestions, lenses, type Question } from "../src/data/lenses";
import { articles, projectSlugs } from "../src/data/site";
import { library, rootName } from "../src/openui/library";

const OUT = "src/generated/answers.json";
const CV_URL = "https://raw.githubusercontent.com/mehimanshupatil/cv/main/src/data/resume.ts";
const MODEL = process.env.OPENUI_MODEL || "openai/gpt-5";
const MAX_ATTEMPTS = 3;

export type AnswersFile = {
	inputsHash: string;
	model: string;
	generatedAt: string;
	source: "openui-cloud" | "seed";
	/** Keyed by Lens slug; "default" is the home page. */
	lenses: Record<string, { intro?: string; answers: Record<string, string> }>;
};

const parser = createParser(library.toJSONSchema(), rootName);

function validate(code: string): string[] {
	const result = parser.parse(code);
	const errors = (result.meta?.errors ?? []).map((e) => JSON.stringify(e));
	if (!result.root) errors.push("No root = Answer(...) statement was produced.");
	return errors;
}

/** Career facts from the cv repo, with contact and SEO fields removed before anything leaves this machine. */
async function loadCv(): Promise<unknown> {
	const res = await fetch(CV_URL);
	if (!res.ok) throw new Error(`Fetching cv failed: ${res.status}`);
	const dir = await mkdtemp(join(tmpdir(), "cv-"));
	const file = join(dir, "resume.ts");
	await writeFile(file, await res.text());
	const { resume } = await import(pathToFileURL(file).href);
	const { contact, seo, ...facts } = resume;
	return facts;
}

async function loadFactBase() {
	const dir = "src/content/projects";
	const files = (await readdir(dir)).filter((f) => f.endsWith(".mdx")).sort();
	const ids = files.map((f) => f.replace(/\.mdx$/, ""));
	const unknown = ids.filter((id) => !(projectSlugs as readonly string[]).includes(id));
	if (unknown.length || ids.length !== projectSlugs.length) {
		throw new Error(`projectSlugs in src/data/site.ts is out of sync with ${dir}: ${ids.join(", ")}`);
	}
	const projects = await Promise.all(files.map(async (f) => ({ slug: f.replace(/\.mdx$/, ""), source: await readFile(join(dir, f), "utf8") })));
	return {
		owner: { name: "Himanshu Patil", headline: "Frontend-focused full-stack engineer", city: "Mumbai" },
		career: await loadCv(),
		projects,
		articles: articles.map(({ title, description, date, site }) => ({ title, description, date: date.toISOString().slice(0, 10), site })),
	};
}

function instructions(factBase: unknown, focus?: string) {
	return [
		"You answer recruiters' questions about Himanshu Patil on his portfolio site, in the third person.",
		"Use ONLY the facts in the FACT BASE below. Never invent employers, dates, numbers, metrics, technologies or projects.",
		"If the facts do not answer the question, say so plainly in the Lead and stay brief.",
		"Prefer a Project card whenever a project is relevant. Keep the whole answer under 120 words.",
		"Plain, confident tone. No superlatives, no hype words, no emoji.",
		focus ? `Emphasis for this reader (emphasis only, not facts): ${focus}` : "",
		"",
		"FACT BASE (JSON):",
		JSON.stringify(factBase),
	]
		.filter((line) => line !== "")
		.join("\n");
}

async function generateOne(client: OpenAI, system: string, prompt: string): Promise<string> {
	let input = prompt;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		const response = await client.responses.create({
			model: MODEL,
			input,
			instructions: system,
			stream: false,
			store: false,
		});
		const code = response.output_text.trim();
		const errors = validate(code);
		if (errors.length === 0) return code;
		console.warn(`  attempt ${attempt} invalid: ${errors.join("; ")}`);
		input = `${prompt}\n\nYour previous answer had these OpenUI Lang errors; fix them:\n${errors.join("\n")}\n\nPrevious answer:\n${code}`;
	}
	throw new Error(`No valid answer after ${MAX_ATTEMPTS} attempts for: ${prompt}`);
}

async function readExisting(): Promise<AnswersFile | null> {
	try {
		return JSON.parse(await readFile(OUT, "utf8"));
	} catch {
		return null;
	}
}

function checkFile(file: AnswersFile) {
	const problems: string[] = [];
	for (const [slug, entry] of Object.entries(file.lenses)) {
		for (const [key, code] of Object.entries({ ...(entry.intro ? { intro: entry.intro } : {}), ...entry.answers })) {
			const errors = validate(code);
			if (errors.length) problems.push(`${slug}/${key}: ${errors.join("; ")}`);
		}
	}
	return problems;
}

async function main() {
	const args = new Set(process.argv.slice(2));
	const existing = await readExisting();

	if (args.has("--check")) {
		if (!existing) throw new Error(`${OUT} is missing`);
		const problems = checkFile(existing);
		if (problems.length) throw new Error(`Invalid answers:\n${problems.join("\n")}`);
		console.log(`${OUT} is valid.`);
		return;
	}

	const factBase = await loadFactBase();
	const spec = { ...library.toSpec(), schema: library.toJSONSchema() };
	const plan: { slug: string; focus?: string; intro?: string; questions: Question[] }[] = [
		{ slug: "default", questions: defaultQuestions },
		...lenses.map((l) => ({ slug: l.slug, focus: l.focus, intro: l.reader, questions: l.questions })),
	];
	const inputsHash = createHash("sha256").update(JSON.stringify({ factBase, plan, spec, MODEL })).digest("hex");

	if (!args.has("--force") && existing?.inputsHash === inputsHash && existing.source === "openui-cloud") {
		console.log("Inputs unchanged; nothing to generate.");
		return;
	}

	const apiKey = process.env.THESYS_API_KEY;
	if (!apiKey) throw new Error("THESYS_API_KEY is not set");
	const client = new OpenAI({ apiKey, baseURL: "https://api.thesys.dev/v1/embed" });

	const out: AnswersFile = { inputsHash, model: MODEL, generatedAt: new Date().toISOString(), source: "openui-cloud", lenses: {} };
	for (const item of plan) {
		const system = generateSystemPrompt({ cloud: true, library: spec, instructions: instructions(factBase, item.focus) });
		const entry: AnswersFile["lenses"][string] = { answers: {} };
		if (item.intro) {
			console.log(`${item.slug}: intro`);
			entry.intro = await generateOne(
				client,
				system,
				`Write a short introduction of Himanshu for a ${item.intro}: a Lead plus at most two supporting blocks.`,
			);
		}
		for (const q of item.questions) {
			console.log(`${item.slug}: ${q.id}`);
			entry.answers[q.id] = await generateOne(client, system, q.q);
		}
		out.lenses[item.slug] = entry;
	}

	await writeFile(OUT, `${JSON.stringify(out, null, "\t")}\n`);
	console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
