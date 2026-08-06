---
title: "The tiny 'slow‑mode' flag I added to our API — and how it stopped a rollout in a Bengaluru office"
pubDate: 2026-08-06
description: "I added a controllable 'slow mode' to our API to reproduce real‑world latency and packet loss. It caught timeouts our tests missed — and taught me the costs of simulated chaos."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with a coffee cup on a wooden desk"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["testing", "backend", "reliability"]
---

It was 11:30 a.m. and our sales engineer was on a call in a cramped client office in Koramangala. The demo had worked the night before in my home lab on fiber. In that office, every API call timed out at 8–10 seconds. The frontend showed a spinner that never ended. The client was polite but disengaged. My laptop, five hours of debugging, and a dozen console.log inserts later, I still couldn't reproduce the failure from anywhere inside our office or CI.

We'd written functional tests. We had load tests. None of them modeled a network that loses packets, queasy mobile backhaul, or overloaded NAT gateways that the client's ISP might have. We were testing happy paths in perfect conditions — the exact conditions our users did not have.

So I built one tiny switch into the API: SLOW_MODE. It was deliberately blunt — a single flag that, when enabled, adds configurable latency, occasional dropped responses, and a small probability of partial responses. It lived behind a feature toggle and an environment variable. I used it locally, in PRs when explicitly requested, and in a controlled staging subset. It isn't glamorous. It is, however, stupidly effective.

Why a single flag

I wanted something minimal that didn't require a full network lab, yet could exercise the code paths that timeout or retry. The goals were:

- Reproduce client‑perceived failures (timeouts / spinner loops).
- Exercise our retry and fallback logic.
- Do it cheaply — on my laptop and in a tiny staging subset.
- Make it deliberate and visible so nobody accidentally left it on in prod.

Implementation notes (practical, not theoretical)

I added SLOW_MODE to our request middleware. It accepted a small JSON payload or query params for interactive use, and two ENV variables for automated runs:

- SLOW_MODE=on|off — master switch.
- SLOW_LATENCY_MS=200,600,1200 — sampled latency added per request.
- SLOW_DROP_RATE=0.05 — percent chance of dropping the response before headers.
- SLOW_PARTIAL_RATE=0.02 — chance of sending partial JSON then closing the socket.

For local dev I used a simple deterministic sampler (hash of path + seed) so I could reproduce the same failed request across reloads. In CI/staging I made the sampler random but logged each injection with a unique ID and sent that ID to our tracing system (Zipkin). That made test failures explainable: we could say "this failure was seen with SLOW_MODE id=abc123, here's the trace."

Where I ran it

- Local dev: default off. I flipped it on when reproducing bugs. Passing query param ?slow=latency,drop made quick experiments easier.
- PRs: off, but on-demand. A reviewer could add a label "please-slow" to spin up a preview with slow-mode enabled for a short window.
- Staging: enabled for 5% of traffic in a dedicated namespace, with explicit alerting.

The wins

1) The Koramangala client: with latency and 10% drop simulation, the frontend's retry backoff hit an edge-case where two concurrent retries raced and left both requests blocked behind a backpressure limiter we didn't know existed. Fixing that (switching limiter algorithm and reducing per-client concurrency) made the demo work on a flaky mobile connection.

2) We discovered user‑visible partial JSON bugs. In production we'd seen occasional UI hangs with no errors logged. SLOW_MODE reproduced the exact partial-body closure that left the JSON parser waiting forever. Fixing the parser to fail fast and show a user‑friendly message prevented multiple support tickets.

3) Better test coverage for retry semantics. Our unit tests weren't asserting how many retries the client should do. With SLOW_MODE we added deterministic failure scenarios and asserted both the retry count and the fallback UI.

The honest failures and tradeoffs

SLOW_MODE taught me about shortcuts you pay for.

- It made tests flaky when I wasn't careful. Early on I enabled SLOW_MODE in a staging load test, forgot to scope it, and then wondered why our nightly run "failed". People started ignoring alerts from the staging job because it flipped failures on and off. I fixed this by adding audit logs and a hard requirement: SLOW_MODE in any automated job needs an approval token and a short TTL.

- It created a false sense of coverage. Simulated latency and drops don't perfectly match real ISP behaviors like reordering, TCP-level retransmissions, or MTU issues. After one incident where SLOW_MODE passed but a production buggy NAT behavior still caused failures, I realized that simulation complements but doesn't replace real-world testing (device labs, on‑prem VPNs, cheap data‑center nodes in metros).

- It increased complexity. We added extra code paths to guard the flag. I had to be paranoid: disable in prod unless explicitly allowed, add an admin-only endpoint to toggle it, and ensure toggles are audited. That work is boring but necessary.

An everyday constraint that mattered

In India, mobile backhaul and office networks vary wildly. A ₹1,200 dongle, a 4G congested corridor during commute hours, or a municipal building's shared Wi‑Fi gave me edge cases that no lab emulated. I bought a ₹500 prepaid data SIM and a cheap 4G router to test in the exact conditions that our enterprise clients sometimes use. Combined with SLOW_MODE that was enough to find most problems.

What I walked away with

A controllable, visible chaos switch is more useful than ten theoretical load tests. It forced us to test how our code feels to users — not just whether endpoints return 200s. The second lesson: make the chaos deliberate, observable, and short‑lived. If you can't log every injected failure with an ID, you'll create more noise than value.

If you build anything like this, do three things right away: default it off in prod, wire every injection into your tracing system, and require an approval token for any automated runs. After that, the tiny flag will save more demos than it will cost you in accidental flakiness.