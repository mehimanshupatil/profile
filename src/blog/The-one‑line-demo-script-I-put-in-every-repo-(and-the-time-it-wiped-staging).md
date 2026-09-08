---
title: "The one‑line demo script I put in every repo (and the time it wiped staging)"
pubDate: 2026-09-08
description: "I started adding a single, idempotent demo script to every repo to seed a reproducible demo state — and learned hard lessons the day it ran against staging."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a desk showing code editor and terminal windows"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["developer-tools", "dev-experience", "reproducibility"]
---

I was three minutes into a client demo — screen sharing, two product managers on the call, and the UI stubbornly showing an empty dashboard. My app was live. My code was fine. The customer data that made the demo convincing lived in a messy corner of staging, populated by half-broken scripts and the occasional manual paste. I spent the next ten minutes trying to reproduce a single user state while everyone watched. It sucked.

After that week of pressure calls, I started adding the same file to every project: scripts/demo.sh (and a Makefile alias so the command was literally make demo). One command, idempotent, documented in the README, that would bring a fresh environment to demo‑ready shape in under two minutes. It’s been the single habit that saves my demos. Until the time it didn’t — and taught me the hard constraints of making "one command to demo" safe.

Why one line matters
We all have versions of this problem: demos fail because the environment doesn't match the narrative. Different colleagues have different local setups. Staging drifts. A demo script reduces cognitive overhead: no hunting for sample IDs, no "oh right, you need this migration", no frantic SQL chops under pressure.

My demo script does three things:
- boots the local stack via docker-compose (or uses an existing dev cluster),
- restores a compressed, scrubbed snapshot of the data (pg_restore for Postgres),
- runs a tiny post-seed script to enable feature flags and create demo credentials.

In the repo it’s one line: make demo, which calls scripts/demo.sh. That single command saves me 20–30 minutes of setup per demo and dramatically raises the chances the demo will actually show the thing I want to show.

How I make it safe (most of the time)
Making seeding reproducible is technically straightforward; making it safe is the trick. Here are the constraints I accepted and the guard rails I use.

1) Minimal, scrubbed snapshot (₹0–₹200 to host)
I keep a compressed dump in the repo or in an internal S3-like store: demo-data.sql.gz. It’s scrubbed — PII removed, emails replaced with demo@company.test, payment IDs replaced with fake values. If restoring the full production snapshot was tempting, I stopped myself. The snapshot needs to be small (10–50MB) so restores are fast on office fibre and on a café hotspot.

2) Environment guard rails
scripts/demo.sh refuses to run against anything that looks like production. Specifically:
- It checks $DATABASE_URL and exits if it points to a host outside localhost/127.0.0.0/10 ranges.
- It requires a DEMO=1 environment variable or a confirmed prompt if someone runs it interactively.
- There's also a --dry-run flag that prints what would happen.

3) Idempotence
The script truncates tables and restores, instead of dropping the whole database. Migrations are applied after restore. This reduces the blast radius and lets you run make demo multiple times without racing to recreate users.

4) Fast local stacks
I cache container images and avoid huge assets. On my ₹3,800 router at home and a 10GB mobile hotspot, the last thing I want is Docker pulling 1GB images during a demo.

The failure that changed everything
Two months in, I got sloppy. A new teammate ran make demo to prep for a handoff. The team’s staging had been moved to a new host the week before. Their laptop had a global DATABASE_URL env var (set by another project). Our demo guard looked for obvious production hostnames and CIDR ranges — it didn’t catch an IP that happened to be the new staging host. The script ran, and our sanitized demo restore wiped several tables on staging. Nothing irrecoverable happened — we had backups and a calm weekend to restore — but the incident cost credibility and an embarrassing postmortem.

That failure forced a redesign:
- No defaults. The script now refuses to run if DATABASE_URL is set. You must explicitly pass DEMO_DB or use the provided local docker-compose network. Explicit wins over clever autodetection.
- A CI check that ensures demo-data.sql.gz is scrubbed. A simple regex scan for @ and indian phone patterns would have flagged an oversight.
- A nightly snapshot job that creates and stores the demo dump from a scrubbed canonical staging instance, so the team doesn’t rely on ad‑hoc copies.
- Documentation in the README with a bold warning: "Never run against staging or production. Use local containers or the demo cluster."

Tradeoffs I accepted
There are costs. Writing and maintaining the demo script takes time — 30–90 minutes per repo initially, and occasional tweaks after migrations. The scrubbed snapshot diverges from production; sometimes it's missing the exact edge case I want to show. Idempotence and safety mean the script can’t reproduce every real-world mess. I also added friction (explicit flags) that some teammates grumble about when they just want a quick state.

But the tradeoff is deliberate: demos are frequent and visible. The few minutes of added friction saved us from multiple 15‑minute scrambles and one very public apology email.

A tiny example (what mine looks like)
I’ll keep it short. My Makefile has:
demo:
	TODO= make demo

And scripts/demo.sh:
- check that DEMO=1 is set or exit
- refuse if $DATABASE_URL looks remote
- docker-compose up -d db
- pg_restore -d demo_db demo-data.sql.gz
- ./scripts/post-seed.sh

No magic. No attempt to be clever. Just safety-first steps, small and repeatable.

What I learned
Automating your demo state is worth the upfront time. But safety is not optional. The single failure we had was avoidable and taught me that "it works locally" isn't enough — the script needs to assume the user is fallible and noisy, especially in busy Indian teams where people carry global env vars across multiple projects.

If you take one thing away: spend an hour to write an idempotent, explicit demo script with an environment guard. It will save you a demo or three, and one honest mistake will force you to harden it anyway. My current takeaway: make the safe path longer than the dangerous path, and document the hell out of it.