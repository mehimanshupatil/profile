---
title: "Why I Add Small Delays to UI Tests (and the one time it nearly doubled CI time)"
pubDate: 2026-09-30
description: "I started inserting tiny, targeted delays in end‑to‑end UI tests to expose race conditions caused by real‑world latency. It found bugs—until it slowed our CI and masked one timing bug."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with code visible on the screen and a coffee cup to the side"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["testing", "developer-tools", "infra"]
---

I was on a client call. The demo worked on my laptop. It failed for them. They were on a corporate Wi‑Fi in Pune with a laptop that felt like it was from 2016. Their session kept missing a UI update and clicking an inactive button. The logs showed nothing. Locally, headless Playwright ran the same flow in 400ms and passed. The customer saw 1,200–1,800ms delays and a race.

That was my friction: tests that were too "fast" to find bugs that users on flaky networks actually hit. We had an occasional support ticket every few weeks. Each one was a lottery: reproduce on a physical phone, boot a test VM, pray. I needed a reliable way to make our automated tests behave more like real users in India — not just fast CI bots on an infinite pipe.

What I changed (and why it matters)
I started adding deliberate, tiny delays in specific spots of our E2E tests: between sending an action and asserting the resulting UI state. Not big sleeps. Controlled, short delays — often 100–200ms, sometimes a 500ms jitter in network‑heavy paths like payments or SSO. The goal was not to slow everything, but to let the browser and the app's background work (renders, async state reconciliation, mobile network jitter) catch up in the same way a real device would.

Concretely:
- I added a small helper, waitForRealWorld(ms), that wraps an await new Promise(resolve => setTimeout(resolve, ms)). Tests import it and use it after actions that trigger background operations: after clicking “Pay”, after OAuth redirects, after triggering a websocket update.
- Defaults were tiny (100–150ms). For flows that hit payment gateway or third‑party SSO, we used a 250–500ms jitter: waitForRealWorld(Math.floor(Math.random() * 300) + 200).
- The delays are enabled via an env var: REALWORLD_DELAY=true. CI can turn them off for speed; we enable them for nightly flaky runs and local dev when debugging support tickets.

Why this worked
Two things were happening in production that our original tests never simulated:
1) Browsers on cheap Indian devices and corporate proxies reorder rendering / repaint under load. A 40ms paint difference can change whether a button becomes clickable in time.
2) Payment PSPs and banks in India often respond with variable latency. Our fast tests never hit the slower tails, so race conditions in our front‑end state machine stayed hidden.

The delays exposed multiple real bugs in a week:
- A missing await in our Redux flow that lost an optimistic update when the network returned late.
- A race where a retry logic re-rendered an older token snapshot.
- A subtle focus bug on Android Chrome where touch events queued differently under load.

Failure: it nearly doubled our nightly CI
This change found bugs so effectively we turned the delays on for our nightly runs. And then I made a dumb decision: I enabled the jitter globally across the suite to "be safe". Nightly CI time jumped from 90 minutes to 160 minutes. That’s not a headline metric — 70 extra minutes every night is developer friction, delayed feedback, and cost (our hosted runners bill climbs).

Worse, one of the bugs we found was masked by the delays. A fragile timing bug in an optimistic update only reproduced when the round‑trip was <70ms. Our deliberate delays made the test pass consistently, hiding that specific regression. We had a week of false confidence until an on‑call customer hit it.

Tradeoffs I accepted (and how I recovered)
- Speed vs realism: I accepted that realistic tests will be slower. But I rejected "slower everywhere." Global sleeps were the mistake. I moved to targeted waits: only after user actions that historically flaked in the field.
- Determinism vs jitter: random jitter exposes more cases but makes flaky tests harder to triage. I kept a reproducible mode: REALWORLD_JITTER=0 for deterministic runs, >0 for nightly, >0.5 for long‑tail runs.
- CI cost: instead of paying for longer hosted runners, we run realistic suites on a cheap self‑hosted runner (a ₹3,000/month Raspberry Pi cluster on an 8Mbps home connection at off‑peak hours) and keep fast smoke checks on hosted runners. That halved our external bill while keeping coverage.

A few practical rules I settled on
- Target, don't blanket: Put delays only after actions that start background work (network calls, optimistic updates, animation frames). Avoid sleeps in setup/teardown.
- Make them toggleable: env vars and a test tag (e.g., @realworld) decide when they run. Local dev defaults to on; PRs default to off.
- Combine with netem for realistic networking: in one failing case, adding a 200–500ms delay didn't reproduce the issue. Adding 200ms latency to the network with netem did. Tests should simulate both CPU/rendering delays and network tails.
- Keep assertions robust: prefer waitForSelector(condition) with timeouts over fixed assertions. The intentional wait buys you room, not brittle timing.
- Measure impact: I log test durations and count flakes before and after. We saw a 4× reduction in the specific flake rate for one payment flow after targeted delays.

India specifics that matter
- Corporate networks and cheap Android phones matter. In Bengaluru or Tier‑2 client offices, median network latency and CPU load differ wildly from CI in Mumbai or Singapore.
- PSPs and bank redirects have long tails. On UPI and NPCI-related flows, 300–1,000ms variations are normal, and tests must account for that.
- Mobile data costs matter for manual reproduction. A reliable, fast local way to reproduce a user's timing profile saves both time and mobile data expense when I ask someone on the other end to test.

What I walked away with
Tiny, deliberate waits are not a band‑aid. They’re a diagnostic tool: they make hidden races visible and reproducible. But they're also a blunt instrument — used everywhere they become a cover-up and a CI tax. The rule I actually kept: make realism targeted, toggleable, and measured. That single policy turned intermittent support calls into reproducible bugs I could fix in a morning, without permanently doubling our CI bill.