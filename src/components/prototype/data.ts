// PROTOTYPE — throwaway data for the Mumbai Local identity prototype. Answers are stubs, not real OpenUI output.

// Western Line fast-train stops double as the site's sections.
export const stations = [
	{ id: "intro", en: "Churchgate", mr: "चर्चगेट", hi: "चर्चगेट", code: "CCG", section: "Intro" },
	{ id: "about", en: "Mumbai Central", mr: "मुंबई सेंट्रल", hi: "मुंबई सेंट्रल", code: "MMCT", section: "About" },
	{ id: "work", en: "Dadar", mr: "दादर", hi: "दादर", code: "DDR", section: "Work" },
	{ id: "projects", en: "Bandra", mr: "वांद्रे", hi: "बांद्रा", code: "BA", section: "Projects" },
	{ id: "ask", en: "Andheri", mr: "अंधेरी", hi: "अंधेरी", code: "ADH", section: "Ask me" },
	{ id: "contact", en: "Borivali", mr: "बोरिवली", hi: "बोरीवली", code: "BVI", section: "Contact" },
] as const;

export const owner = {
	name: "Himanshu Patil",
	headline: "Frontend-focused full-stack engineer",
	city: "Mumbai",
	years: 7,
	pitch:
		"I build interfaces that feel fast and fair: component systems, generative UI, and the occasional real-time 3D simulation of the train you are riding.",
};

export const experience = [
	{ from: "Mar 2021", to: "Now", role: "Full-Stack Developer", org: "Canvs", note: "Generative-UI app, LLM-friendly component library, Chrome/Figma/Sketch integrations, serverless on AWS." },
	{ from: "Jun 2019", to: "Feb 2021", role: "Software Developer", org: "Bizotics", note: "Angular 5→8 migration, Gatsby performance work, dynamic form platform." },
];

export const projects = [
	{ slug: "mumbai-lakes", name: "Mumbai Lakes", line: "Live 3D map of the city's seven supply lakes on real terrain, updated daily.", stack: "React · R3F · three.js", platform: 1, kind: "F", live: true },
	{ slug: "mumbai-local-sim", name: "Mumbai Local Sim", line: "Real-time 3D sim of the Western line running all 1,321 timetabled services.", stack: "React · R3F", platform: 2, kind: "F", live: false },
	{ slug: "localkit", name: "LocalKit", line: "PDF, image, video and audio tools that never leave your browser.", stack: "Astro · WASM · FFmpeg", platform: 3, kind: "S", live: false },
	{ slug: "shillak", name: "Shillak", line: "Offline-first group finances with encrypted peer-to-peer sync.", stack: "React · Dexie · PeerJS", platform: 4, kind: "S", live: false },
];

export const questions = [
	{ q: "What has he built in 3D?", a: "Two real-time 3D apps on React Three Fiber: Mumbai Lakes (terrain + daily BMC data) and Mumbai Local Sim (every Western line service on the real timetable)." },
	{ q: "How deep is his React?", a: "Seven years across React, Next.js and Angular. Owns a company-wide component library designed so LLMs can find and use it, and led a Draft.js → Lexical editor migration." },
	{ q: "Has he shipped generative UI?", a: "Yes — a generative-UI chat app at Canvs with a design-palette system, backed by a serverless AWS stack. This site's Ask-me answers are generated the same way." },
	{ q: "Can he own a feature end to end?", a: "Front to back: React UI, Lambda + API Gateway services via SAM, and multi-environment CI/CD from a single build." },
];
