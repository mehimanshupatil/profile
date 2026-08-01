---
title: "The tiny JSON schema that stopped my 'it works on my machine' demos"
pubDate: 2026-08-01
description: "I started validating .env files with a small JSON schema and a prestart check. It stopped two demo failures, forced one messy midnight bypass, and changed how we ship."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of hands typing on a laptop placed on a wooden desk, showing a laptop keyboard and code on the screen"
  caption: "Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["dev-tools", "infra", "reliability"]
---

It was 10:35am on a Tuesday. I was at my desk in a small co-working space in Koramangala, with a client demo scheduled for 11:00. The app booted locally just fine on my machine three times that morning. On the client's screen it crashed before the signup page. No stack trace in Sentry. No obvious missing secrets. The panic was quiet, bureaucratic and crushing: "Can we reschedule?"

The root cause was embarrassingly small. We were parsing an env var into a number — PORT or MAX_RETRIES or whatever — and depending on whether the environment set it as "5" or 5 the code behaved differently. Our staging `.env` had a string. My laptop had an integer. The difference only showed up when the code path hit a rate limiter we forgot existed. Five minutes of frantic logging later, we fixed it and the demo went ahead at 11:35. The client was kind. I wasn't.

After that day I did two things: I stopped trusting "it boots on my machine" and I added a tiny JSON schema and a 200-line validator script to every repo I touch. It costs me 30 seconds on every start and has prevented two client-facing failures since. It also bit me once at 2am, which forced a useful change to our incident workflow. Here's the exact habit and why it's worth stealing.

Why envs lie to you
Environment variables are the cheapest contract between environments: dev laptop, CI, staging, production. Cheap contracts are also fragile. The problems I saw most:

- Type mismatches: "true"/"false" vs boolean, "3000" vs 3000.
- Missing keys that are optional in prod but required in a feature branch.
- Subtle formatting: trailing commas inside JSON env values, URLs missing scheme.
- Silent fallbacks in libraries that mask missing values until a specific code path runs.

In India this is worse because our CI often runs on modest hosted runners and staging is on a crowded VPS. Long feedback loops mean these small mismatches make it to demos or night deployments.

What I added (actual files and where)
I keep this deliberately minimal. Nothing fancy, no new orchestration. The pieces:

1) repo/.env.schema.json — a small JSON Schema describing required keys, types, formats, and simple patterns. Example snippet:

{
  "type": "object",
  "required": ["PORT", "DATABASE_URL", "FEATURE_FLAG_X"],
  "properties": {
    "PORT": { "type": "integer", "minimum": 1024, "maximum": 65535 },
    "DATABASE_URL": { "type": "string", "format": "uri" },
    "ENABLE_SIGNUP": { "type": "boolean" },
    "MAX_RETRIES": { "type": "integer", "minimum": 0 }
  },
  "additionalProperties": false
}

2) repo/bin/validate-env.js — a tiny Node script (or a Go binary, pick your runtime) that:
   - Reads process.env (or loads .env for local dev with dotenv).
   - Coerces obvious strings to numbers/booleans when the schema says so (optional).
   - Runs ajv (fast JSON Schema validator) and prints human-friendly errors with suggested fixes.

3) Hook it into start scripts and systemd user services:
   - package.json: "start": "node ./bin/validate-env.js || (echo 'ENV validation failed' && exit 1) && node ./dist/index.js"
   - CI: validate-env runs in a dedicated step before tests.
   - On staging, the same check runs as a systemd ExecStartPre.

Why this works for me
- Fast feedback loop: I see "PORT must be integer" before the app even logs its first request.
- Deterministic demos: if my laptop passes the same validator as staging, the surface area for surprises drops.
- Documentation doubles as code: the schema becomes the single source of truth for ops and new hires.

Concrete wins: two demos and one scheduled deploy didn't face the same failures later. A junior dev who'd been struggling with mysterious crashes learned to run the validator locally and stopped shipping partial .envs.

The tradeoffs — the failure I won't ignore again
There is cost. Here's the honest failure.

One midnight deploy required a hotfix. A rotated secret was missing from staging because an automated job hadn't updated it. Our prestart validator failed the staging unit and systemd refused to bring the service up. No logs, no new release. I was awake, frustrated, and split between two bad options: roll back the deploy or bypass the validator. I chose bypass, deployed, and then fixed the secret manually. The service came up. The bypass felt wrong.

After that night I made two changes:
- Added an "emergency" flag for on-call that documents bypasses (--allow-env-bypass with an entry in an incident log) and requires a postmortem within 24 hours.
- Made certain keys "allowMissingInStaging" if their absence is known and safe during a hotfix. The schema supports an "env:stageOptional" extension used only by systemd prestart.

So the validator had a real operational cost: it blocked an emergency flow until we adapted our process. That was the right pain — it forced us to formalize what "emergency" means, who can bypass, and how we restore safe invariants.

Practical tips for Indian teams
- Keep the schema in the repo and small. Don't try to model every edge case. Start with types and required keys.
- Coercion helps. For local dev I coerce "true" → boolean and "3000" → number. For CI and staging coercion is off.
- Make the validator lightweight. It runs in tens of milliseconds with ajv and node on a cheap ₹300 runner.
- Commit sample .env.ci and .env.local that pass the schema so new devs can start without guessing.

One takeaway
Validation isn't about preventing every possible runtime bug; it's about cutting the most common cause of "works on my machine" — mismatched contracts. Adding a compact JSON schema and a single prestart check cost me 30 seconds and a little maintenance, and saved me a messy demo and several late-night detective sessions. If you're shipping demos or client-facing features from a laptop, it's the cheapest insurance you can buy.