import type { ProjectSlug } from "./site";

export type Block =
	| { type: "para"; text: string }
	| { type: "bullets"; items: string[] }
	| { type: "project"; slug: ProjectSlug; why: string }
	| { type: "stats"; items: { value: string; label: string }[] }
	| { type: "timeline"; stops: { when: string; title: string; detail?: string }[] }
	| { type: "tags"; items: string[] };

/** A hand-written Answer: one-sentence lead, then supporting blocks. Facts only from the CV and Case Studies. */
export type Answer = { lead: string; blocks: Block[] };

/** Keyed by Question id. Lens questions share ids with the home questions where the answer is the same. */
export const answers: Record<string, Answer> = {
	"3d": {
		lead: "Two real-time 3D apps built on React Three Fiber, both running on real Mumbai data.",
		blocks: [
			{ type: "project", slug: "mumbai-local-sim", why: "Simulates the Western line on the real public timetable, over real terrain." },
			{ type: "project", slug: "mumbai-lakes", why: "Maps the city's seven supply lakes in 3D, updated from BMC's daily report." },
			{
				type: "stats",
				items: [
					{ value: "1,358", label: "timetabled services" },
					{ value: "37", label: "stations" },
					{ value: "7", label: "supply lakes" },
				],
			},
		],
	},
	"react-depth": {
		lead: "Seven years of production frontend work across React, Next.js and Angular.",
		blocks: [
			{
				type: "para",
				text: "At Canvs he led the Cassini landing platform in Next.js and architected reusable component systems adopted across repos.",
			},
			{ type: "tags", items: ["React", "Next.js", "TypeScript", "Angular", "Redux", "React Query", "Zustand"] },
			{
				type: "timeline",
				stops: [
					{ when: "Jun 2019", title: "Software Developer, Bizotics", detail: "Led the Bryzos Dashboard migration from Angular 5 to 8." },
					{ when: "Mar 2021", title: "Full-Stack Developer, Canvs", detail: "Next.js platform work, component systems, design-tool integrations." },
				],
			},
		],
	},
	genui: {
		lead: "Yes. At Canvs he built a generative-UI chat app with its own design-palette system.",
		blocks: [
			{ type: "para", text: "The app runs on a serverless AWS backend, and the component library behind it was built to be easy for LLMs to find and use." },
		],
	},
	"end-to-end": {
		lead: "Yes. He ships the interface, the serverless backend and the pipeline that deploys them.",
		blocks: [
			{
				type: "bullets",
				items: [
					"Serverless backends with AWS SAM, Lambda and API Gateway",
					"Multi-environment CI/CD from a single build",
					"Chrome extension, Figma and Sketch plugin integrations across 3+ platforms",
				],
			},
			{ type: "project", slug: "shillak", why: "Built end to end: an offline-first app with encrypted device-to-device sync." },
		],
	},
	performance: {
		lead: "Load-time work on marketing sites and heavy computation kept inside the browser.",
		blocks: [
			{
				type: "bullets",
				items: [
					"Built an SEO-optimised Gatsby homepage for Bryzos and improved load performance through bundle analysis and code splitting",
					"Runs FFmpeg, PDF processing and an ONNX model client-side in LocalKit",
				],
			},
			{ type: "project", slug: "localkit", why: "Server-grade file processing in a tab, with no uploads." },
		],
	},
	migrations: {
		lead: "Yes: an Angular 5 to 8 dashboard migration, and an editor migration from Draft.js to Lexical.",
		blocks: [
			{
				type: "timeline",
				stops: [
					{ when: "Bizotics", title: "Bryzos Dashboard, Angular 5 → 8", detail: "Modernised the architecture and removed legacy dependencies." },
					{ when: "Canvs", title: "Draft.js → Lexical", detail: "Rich-text editor migration in the Cassini component library." },
				],
			},
		],
	},
	"component-systems": {
		lead: "Reusable component systems and API libraries adopted across Canvs's repos.",
		blocks: [
			{
				type: "bullets",
				items: [
					"Architected private API libraries and component systems shared across multiple repos",
					"Built a component library designed so LLMs can find and use it",
					"Built shared internal tooling adopted across teams",
				],
			},
			{ type: "tags", items: ["React", "TypeScript", "Storybook", "Tailwind CSS"] },
		],
	},
	"design-tools": {
		lead: "Yes. He has shipped Figma and Sketch plugins alongside a Chrome extension.",
		blocks: [
			{ type: "para", text: "At Canvs these integrations enable product workflows across three or more platforms." },
			{ type: "tags", items: ["Figma Plugin API", "Sketch Plugins", "Chrome Extensions"] },
		],
	},
	backend: {
		lead: "Serverless AWS backends and the pipelines that ship them.",
		blocks: [
			{
				type: "bullets",
				items: [
					"Serverless infrastructure with AWS SAM, Lambda and API Gateway for file processing and workflow automation",
					"CI/CD supporting multi-environment deployments from a single build",
					"Node.js and REST APIs",
				],
			},
		],
	},
	solo: {
		lead: "Four live products, each designed, built and deployed on his own.",
		blocks: [
			{ type: "project", slug: "mumbai-local-sim", why: "Real-time 3D simulation of the Western line." },
			{ type: "project", slug: "localkit", why: "Private file tools that run entirely in the browser." },
			{ type: "project", slug: "shillak", why: "Offline-first shared budgets with no server." },
			{ type: "project", slug: "mumbai-lakes", why: "Daily 3D map of Mumbai's water supply." },
		],
	},
	"real-data": {
		lead: "He bakes official and open data into the app, and validates it before anything ships.",
		blocks: [
			{
				type: "bullets",
				items: [
					"BMC's daily lake report arrives only as an image; it is OCR'd and every number cross-checked before the map updates",
					"Terrain from AWS Terrain Tiles, rivers and track geometry from OpenStreetMap",
					"The Western Railway timetable baked from the official public time-table PDFs",
				],
			},
			{ type: "project", slug: "mumbai-lakes", why: "Validation-first daily data pipeline." },
		],
	},
	simulation: {
		lead: "A pure, deterministic core turns the network, the services and the clock into train positions.",
		blocks: [
			{ type: "para", text: "Every slow, fast and AC local runs the real timetable, so fast trains overtake slow ones because the schedules say so; nothing is scripted." },
			{
				type: "stats",
				items: [
					{ value: "837", label: "slow" },
					{ value: "374", label: "fast" },
					{ value: "147", label: "AC" },
				],
			},
			{ type: "project", slug: "mumbai-local-sim", why: "Pause, 1×, 10×, 60× or sync to live IST." },
		],
	},
};
