---
title: "A repo 'repro' branch that stopped my 2‑hour bug hunts (and the upkeep I finally accepted)"
pubDate: 2026-07-15
description: "How I started keeping a minimal, repo-local 'repro' branch with exact env, docker-compose, and scrubbed fixtures to reproduce nasty bugs fast — plus the cost of keeping it useful."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A person typing code on a laptop with multiple terminal windows visible"
  caption: "Photo by Claudio Schwarz on Unsplash"
  creditUrl: "https://unsplash.com/@claudioschwarz"
tags: ["developer-tools", "debugging", "infra"]
---

It was 3:12 a.m. and the payment flow on staging returned a 502 for one merchant, and 200 for everyone else. The on-call chat was a single stream of "works for me" and "can't reproduce". I sat with the production logs, the payment gateway docs, and a blank local environment that resolutely behaved. Two hours later I finally reproduced it—on a colleague's laptop, after they sent a sanitized DB dump and a dozen env vars. I missed two hours of sleep and learned a single lesson: reproducibility isn't a nicety. It's the difference between a two‑hour drag and a twenty‑minute fix.

So I made a reproducibility habit that lives in git: a dedicated "repro" branch for recurring, hard‑to‑reproduce bugs. It's not glamorous. It’s a tiny folder in the repo with precise ops: locked Docker compose, a scrubbed fixture or two, an .env.example, and a replay script. It costs a little time to maintain and about ₹300–₹500/month if you store larger dumps off‑repo. But it cut my midnight debugging to something I can schedule rather than suffer.

What I keep in a repro branch

The goal is deterministic reproduction without shipping a full production snapshot. I build the repro branch like this:

- A single docker-compose.yml (or docker compose override) that pins exact images, ports, and volumes. No "use my local database", no magic network mode. This file is the contract: start this compose and you should hit the bug.
- Scrubbed fixtures. I keep the smallest SQL/JSON fixtures that trigger the problem — usually <5MB. Real production dumps are unsafe and huge, so I script a "scrub and extract" that pulls only the rows and columns relevant to the bug.
- A small .env and README with exact feature flags, time zone, and any header/cookie needed. This eliminates the "oh but you have X enabled" back-and-forth.
- A replay script (repro/replay.sh) that seeds the fixtures, waits for services, and hits the exact endpoint with the recorded headers/body. The script prints the minimal thing you need to inspect: request, response, and one condensed trace.
- Tests (optional). For intermittent issues I add a simple smoke test in repro/test.sh that CI can run nightly. If the test starts failing for a branch, I know the repro is stale.

I keep all of this under repro/<ticket-id>-short-title so it’s discoverable. The branch name is stable — we never merge these into main. They're living artifacts, not features.

How it changed debugging for me

Before: "Can you reproduce?" meant handing off a full dev environment, waiting for another dev to spin it up, and then staring at logs together. Debugs bled into hours. After: I could say "checkout repro/PG-4322, run repro/replay.sh" and have a failing trace in 10–15 minutes. The real win is coordination: when I assign a bug to someone, they don't need my laptop, my database access, or my patience.

There are engineering wins too. Because the compose is pinned, we saw flaky third‑party services earlier. Because the fixtures are minimal, git blame still points to the last time we touched the payment workflow, not a massive dump committed in 2019.

The hard tradeoffs (and the mistake that nearly killed it)

A reproducible artefact is only useful if it's maintained. I learned the hard way.

First mistake: I initially committed a 200MB scrubbed dump into a repro branch. It worked — until every dev clone pulled eight copies of it in their history and their CI caches ballooned. People started avoiding cloning the repo. My fix: move heavy artifacts off‑repo into cheap object storage (I use DigitalOcean Spaces and an S3 client), and store only a small downloader script and a SHA256 in the branch. That costs around ₹300–₹500/month for my team's usage, and the tradeoff is worth it.

Second problem: staleness. One repro failed to trigger after a dependency bump. We wasted time assuming the bug was fixed. The truth: our repro reflected last year's schema and not the live migrations. I added two rules: (1) a lightweight CI job that runs repro/test.sh weekly and notifies the ticket owner if it fails, and (2) a "refresh" checklist in the repro README saying how to regenerate fixtures and sanity-check schema versions. That reduced false confidence.

Third constraint: legal/privacy. Some bugs require fields you can't store. I had to build a "sanitizer" script early on that removes PII and rotates tokens. The sanitizer is part of the repro tooling and is non-negotiable.

When this isn't for you

If bugs are trivial config problems, a repro branch is overkill. If your team already uses disposable cloud sandboxes that are fast to repro on demand, keep that. The repro branch shines for intermittent, environment‑sensitive bugs that recur: payments, auth edge cases, timezone bugs, background-job races.

Reality check: it needs discipline. The first month I started, I added a repro for every annoying bug and ended up with a cluttered folder. Now I keep one repro per recurring class of failure and retire them after three clean months or after a root cause fix.

The one takeaway I still use

If you fix a bug by saying "it happened only on my machine" or "we can't reproduce", you're trading time for luck. Make one reproducible artifact per recurring bug pattern, keep it tiny, and automate a weekly sanity check. Pay the small storage fee for large fixtures and rotate the responsibility for refreshes into the ticket owner's checklist. It doesn't stop bugs from happening, but it turns luck into an engineerable process — and it saves a lot of 3 a.m. frustration.