// Career facts mirror the cv repo (src/data/resume.ts).
export const owner = {
	name: "Himanshu Patil",
	headline: "Frontend-focused full-stack engineer",
	city: "Mumbai",
	email: "dev@himanshupatil.dev",
	cv: "https://cv.himanshupatil.dev/",
	pitch:
		"I build interfaces that feel fast and fair: component systems, generative UI, and the occasional real-time 3D simulation of the train you're riding.",
};

export const socials = [
	{ label: "GitHub", href: "https://github.com/mehimanshupatil" },
	{ label: "LinkedIn", href: "https://www.linkedin.com/in/mehimanshupatil/" },
	{ label: "X", href: "https://twitter.com/mehimanshupatil" },
	{ label: "CodePen", href: "https://codepen.io/mehimanshupatil" },
] as const;

// Each Station is a Western Line fast stop. Marathi first, then Hindi, then English, as on the platform boards.
export const stations = [
	{ id: "intro", label: "Intro", en: "Churchgate", mr: "चर्चगेट", hi: "चर्चगेट" },
	{ id: "about", label: "About", en: "Mumbai Central", mr: "मुंबई सेंट्रल", hi: "मुंबई सेंट्रल" },
	{ id: "work", label: "Work", en: "Dadar", mr: "दादर", hi: "दादर" },
	{ id: "projects", label: "Projects", en: "Bandra", mr: "वांद्रे", hi: "बांद्रा" },
	{ id: "ask", label: "Ask me", en: "Andheri", mr: "अंधेरी", hi: "अंधेरी" },
	{ id: "contact", label: "Contact", en: "Borivali", mr: "बोरिवली", hi: "बोरीवली" },
] as const;

export type StationId = (typeof stations)[number]["id"];

// Project ids (content/projects/*.mdx); Answers reference projects by these.
export const projectSlugs = ["mumbai-lakes", "mumbai-local-sim", "localkit", "shillak"] as const;
export type ProjectSlug = (typeof projectSlugs)[number];

export const experience = [
	{
		from: "Mar 2021",
		to: "Present",
		role: "Full-Stack Developer",
		org: "Canvs Creative Solutions",
		points: [
			"Led the Cassini landing platform in Next.js across a multi-product codebase.",
			"Shipped Chrome extension, Sketch and Figma plugin integrations across 3+ platforms.",
			"Architected reusable API libraries and component systems adopted across repos.",
			"Built serverless infrastructure with AWS SAM, Lambda and API Gateway, and multi-environment CI/CD from a single build.",
		],
	},
	{
		from: "Jun 2019",
		to: "Feb 2021",
		role: "Software Developer",
		org: "Bizotics Tech Consultancy",
		points: [
			"Built an SEO-optimised Gatsby homepage for Bryzos; improved load performance via bundle analysis and code splitting.",
			"Led the Bryzos Dashboard migration from Angular 5 to Angular 8.",
			"Built a dynamic form platform in Angular 9 for an insurance LMS, plus an Outlook add-in.",
		],
	},
];

// Articles by the owner published on other sites; newest first.
export const articles = [
	{
		title: "Building LocalKit to keep routine file jobs local",
		description: "A client privacy constraint led to building a tool for small file jobs, and how that maps to building with agents.",
		date: new Date("2026-09-29"),
		href: "https://canvs.in/blog/building-localkit-to-keep-routine-file-jobs-local",
		site: "canvs.in",
	},
	{
		title: "Validating vibe code: Notes from a developer",
		description: "Where vibe coding speeds up the workflow, where it falls short, and why deep code knowledge remains essential.",
		date: new Date("2025-07-30"),
		href: "https://canvs.in/blog/notes-on-vibe-coding",
		site: "canvs.in",
	},
	{
		title: "The tinkering mindset of a good developer",
		description: "How tinkering shaped a developer's journey, and why hands-on experimenting is worth the curiosity.",
		date: new Date("2024-10-07"),
		href: "https://canvs.in/blog/the-tinkering-mindset-of-a-good-developer",
		site: "canvs.in",
	},
];
