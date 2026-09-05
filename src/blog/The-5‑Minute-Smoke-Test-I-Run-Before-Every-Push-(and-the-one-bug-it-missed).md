---
title: "The 5‑Minute Smoke Test I Run Before Every Push (and the one bug it missed)"
pubDate: 2026-09-05
description: "I built a tiny, fast smoke-test suite that saves me CI minutes and ruined afternoons — how I picked the tests, wired them into hooks, and where it fails."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with code visible on the screen and a coffee cup beside the keyboard"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["testing", "developer-tools", "ci"]
---

It was 6:10 pm and I had one chance: a demo to a client at 7. I pulled a branch, made a small change, and my laptop — already struggling with an underpowered VM and a throttled home connection — started running the full test suite. Two hours later I had no demo, an annoyed product manager, and a new rule: never run the full suite before a push again.

We do plenty of right things at my startup — feature flags, staging, CI with protected branches — but the cost of running every test locally was real. My personal machine is a 2019 laptop with 8GB RAM. Our CI minutes are not free (we saw a ₹4,200 spike the month we kept rerunning flaky pipelines). Network is often slow at home. Waiting for everything to finish was wasting the one scarce resource I have after work: time.

So I built a 5‑minute smoke suite. Here's how I chose what to run, how I wired it into my workflow, and the painful tradeoff that taught me its limits.

Why a smoke suite (and what "smoke" means to me)
I needed something that's fast, deterministic, and honest about "does this change obviously break the product?" Not "does any test in the repo fail?" — that's CI's job. My smoke suite runs in under five minutes on my laptop and checks the things most likely to explode on a push: app bootstrap, main API endpoints, critical DB queries, auth flows, and a UI snapshot or two for the component I touched.

Concrete rule I followed when picking tests:
- If failure means "we can't demo" or "customers see 500s", include it.
- If failure is flaky in our CI or depends on heavy external systems, exclude it (CI covers those).
- Prefer black-box integration checks over deep unit assertions. They surface real regressions faster.

How I built it (tools and wiring)
I already had tests in Jest and pytest. I didn't want a new framework. I annotated tests with a "smoke" tag/marker and put a tiny runner script in the repo root.

- For Python (pytest): I marked tests with @pytest.mark.smoke and ran pytest -m smoke -q.
- For JS (Jest): I used testNamePattern and grouped critical tests under a common name prefix (Smoke:).
- I added a bash script tests/smoke.sh that:
  - spins up the local lightweight stack (docker-compose -f docker.compose.smoke.yml up -d)
  - waits for readiness endpoints (simple curl loop)
  - runs the framework command
  - tears down the stack

Then I wired tests/smoke.sh into a pre-push Git hook (husky for JS, just a .git/hooks script for others). The hook runs the smoke suite and blocks the push if it fails. It returns fast if unchanged files don't touch backend code (I check git diff --name-only HEAD..HEAD~1 to avoid needless runs).

This combo bought me three things immediately:
- Feedback in under five minutes. I could fix obvious breakages before CI ran.
- Fewer unnecessary CI runs. Our GitHub Actions runs dropped by ~30% and the ₹4,200 spike never repeated.
- A safer demo flow. When I booted my laptop for a client call, I knew the app would at least boot and authenticated endpoints would respond.

The honest failure (and the limitation I had to accept)
Two months in, smoke tests gave me a clean push and confidence. CI went green. I merged. The next day, a merchant complained that payouts stalled. The bug? A background job that reconciles payments on a nightly cron missed a schema change. My smoke suite never touched the nightly worker or the edge-case DB migration because those were slow, async, and involved message queues that are painful to run locally.

There are two lessons from that incident:
- Smoke tests catch "daytime" regressions — things users hit in interactive flows. They don't catch scheduled, async, or rare-data-path bugs.
- Reliance without discipline is dangerous. I had mentally downgraded some CI tests — thinking the smoke suite was enough. I stopped running the nightly integration locally or watching the CI jobs that exercise those flows. That complacency led to the missed migration.

Tradeoffs I accepted
- Speed vs coverage: The suite is intentionally small. I accepted that it won't find everything.
- Maintenance cost: Every new feature that touches core flows requires a decision: add a smoke test or not. I spend roughly 15–30 minutes per feature deciding and updating the suite.
- Local environment fidelity: Running a full Kafka + Redis + Postgres cluster is slow. For smoke, I use lightweight local substitutes (sqlite for a subset of queries, a minimal Redis image). That lowers fidelity but keeps turnout under five minutes.

Practical tips if you want one
- Pick tests for user journeys, not implementation. The app boots and a login + critical endpoint check beats 50 unit tests.
- Make the runner idempotent and fast to spin up. Docker Compose profiles or slim images help.
- Fallbacks: if the hook is blocking and CI is down, allow a manual --no-smoke push with a required rationale commit message. Saved my skin once when CI tripped.
- Keep CI honest. Let CI continue to run the full suite and set a dashboard for async/scheduled jobs. Treat smoke as preflight, not a replacement.

What I actually walked away with
The single thing that changed my day-to-day: I stopped treating pre-push tests as "optional comfort" and made them a small, enforced habit. That bought me predictable demos, fewer late-night CI runs, and calmer afternoons. But the payment bug taught me that a fast safety net can make you careless about deeper coverage. The next problem to solve for me is automating the scheduled-worker tests into CI so a nightly task can't be a blind spot again.

I don't know the perfect balance. But if you're juggling a slow laptop, a small CI budget, and demos at odd hours — build a smoke suite that tells you, fast, whether your change is obviously broken. Then keep the rest of your tests sacred and automated in CI.