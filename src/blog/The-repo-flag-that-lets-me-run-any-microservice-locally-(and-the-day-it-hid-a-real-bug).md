---
title: "The repo flag that lets me run any microservice locally (and the day it hid a real bug)"
pubDate: 2026-08-29
description: "I added a simple --local flag to every microservice to cut setup time. It saved afternoons — until it masked a production bug and forced a stricter rule set."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A developer typing on a laptop at a cluttered desk with notebook and coffee"
  caption: "Photo by Clem Onojeghuo on Unsplash"
  creditUrl: "https://unsplash.com/@clem_onojeghuo"
tags: ["developer-tools", "local-dev", "microservices"]
---

It was 9:40 on a wet Bengaluru morning and I still hadn't reproduced the bug our QA team reported. Every microservice involved meant starting containers, waiting for DB migrations, juggling ports, and cursing my laptop's fan. I missed a meeting. I lost focus. I lost an hour that could have fixed the bug.

So I added a flag: --local. Run the service with it and it would boot with in-memory stubs, an embedded SQLite, and a couple of sensible defaults. No Kafka. No Redis. No key-management calls. No docker-compose. Within 20 seconds the service would be up and I could iterate on the code that mattered.

This is how I implemented it, why it worked, and the hard lesson I paid for.

Why a flag (and not a mock server or full infra)
I tried two other routes first.

- Full docker-compose stacks. Reliable but slow and brittle on personal laptops with 8GB RAM and flaky home broadband.
- Shared local stubs and a standalone mock server. Less setup, but every service had slightly different expectations and the mock quickly became a brittle ball of exceptions.

The flag felt like a local-first compromise. Each repo owned its small local-mode logic. The developer experience was predictable: git checkout, make dev, ./service --local, edit, retry. No context-switching. No special account credentials. Faster feedback loops.

What --local does (the practical bits)
I kept the implementation tiny — the benefit of small, owned surface area.

- Replace external clients with tiny in-process fakes.
  - Kafka -> a sync in-memory queue with the same API surface.
  - Redis -> a dict-backed cache with TTLs (not distributed, obviously).
  - Payment gateway client -> a recorder that accepts test tokens and returns deterministic responses.

- Use a single-file SQLite with a lightweight schema migration step (a local-only migration file).
- Feature flags default to safe values that let flows run end-to-end locally.
- Environment variables required for production (KMS keys, 3rd‑party secrets) are validated at startup only in non-local mode. In --local they are optional and replaced with ephemeral values.
- A small "sanity endpoint" /_local_ready that returns the list of fakes active so debugging is quick.

I documented the caveats in README.md: local mode is for development, never for performance testing, and not for long-lived state.

Why it actually saved time
The gains were immediate and real.

- Fast boot: developers went from waiting 3–6 minutes to being productive in 15–20 seconds.
- Fewer global tools to maintain: new hires didn't need to learn our full infra to ship a fix.
- Less mobile data burnt when I'm working from a hotspot or a co‑working space in Jayanagar.
- Better focus: I could reproduce and fix logic-level bugs without waiting for other teams or queues.

It changed how we debugged — small loop, immediate assertions, and I stopped bringing up the whole stack for every trivial change.

The failure: the bug it hid
Three months later, a high-severity payment failure hit production. Our logs showed a race condition between two services that only occurred under real network latency and when the payment gateway returned a certain timeout code — behavior our local fake never reproduced.

The bug trace led to the local-mode implementation.

- Our payment fake always responded synchronously and in-order. In production, the gateway would occasionally timeout a callback and then later send a delayed confirmation. The delayed path hit a code path we hadn't tested.
- Since most developers were using --local for quick tests, the failing interaction never appeared in our ordinary dev flows. QA had integration tests, but they ran infrequently because they required a full infra bring‑up.

We patched production fast. Then we had the uncomfortable discussion: we had increased developer velocity at the cost of eroding coverage for critical edge cases.

The tradeoffs I accepted (and later tightened)
I wasn't willing to throw away local-mode — it solved real, everyday pain. But I had to stop treating it as a silver bullet.

Changes we implemented:

- Make local-mode explicit in PRs: every PR now has a CI step "run-local-mode-smoke" which starts the service with --local, runs a couple of canned contract tests, and then tears it down. This is quick and catches regressions in the fakes themselves.
- Add a lightweight "slow-path integration" CI job that uses a small Compose file and an instrumented payment sandbox (a mirror of the production gateway's flaky behavior). It runs on merges to main and daily.
- Improve fakes incrementally: our payment fake gained the ability to simulate timeouts, retries, and out‑of-order callbacks. That made it slightly more complex, but also more realistic.
- Label services which must not rely on local-mode for correctness — payments, billing, and any service dealing with money require an integration verification before release.

An honest limitation
Local-mode cannot simulate real network timing and cross-service ordering perfectly. It will never replace periodic integration runs that exercise real queues, timeouts, and third-party quirks. We learned this the hard way when a ₹2.4 lakh transaction path briefly misbehaved in production.

If your team has strict SLAs or deals with payments, treat local-mode as a developer convenience, not as an acceptance criterion.

When I still reach for --local
I use it when I need to:

- Reproduce a unit-level bug that touches only service logic.
- Iterate on a handler, mapper, or a retry policy where the external behavior is deterministic.
- Do quick demos or teach a new joiner a feature without spinning up infra.

When I don't
I avoid --local for final verification, performance work, or anything involving money flows and external callbacks.

What I walked away with
Local-mode is a power tool. It gives you minutes back in your day. But power tools need rules.

We kept the flag. We added CI safety nets and a habit: "If it touches money or async ordering, run an integration check." That single rule prevented another 2 a.m. page and made the tradeoff worth it.

If you add a similar flag to your repos, make the fakes as simple as possible, version them with the repo, and protect the risky paths with automated tests that run outside local-mode. That tiny discipline saved me more than the flag ever did.