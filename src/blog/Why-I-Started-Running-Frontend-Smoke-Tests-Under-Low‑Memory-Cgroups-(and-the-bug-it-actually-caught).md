---
title: "Why I Started Running Frontend Smoke Tests Under Low‑Memory Cgroups (and the bug it actually caught)"
pubDate: 2026-09-27
description: "I started running critical frontend flows inside memory‑limited cgroups to simulate low‑end Android devices. It caught a production crash — and introduced a new kind of CI noise."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with code visible on the screen"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["testing", "frontend", "india"]
---

I was sitting in a client demo room in Bengaluru when the app froze. Not a graceful spinner or a retry — a hard, white screen that left the user having to force‑quit the WebView. The account was on a budget Android phone (told me later: a ₹7,000 hand‑me‑down), multiple tabs open, background apps chewing RAM. The same flow looked fine on my Pixel. That difference — "works on my phone" vs "crashes for real users" — is what made me stop trusting standard headless smoke tests.

We were shipping a heavy, client‑side page with a few large in‑memory caches. On flagship devices it was fine. On phones our Indian users actually use it on, it wasn't. Reproducing that environment in CI felt impossible at first; buying a matrix of test phones is expensive and brittle. So I tried the cheaper route: force the test runner to behave like a low‑memory device.

Why memory, specifically? Because most low‑end Android crashes I see aren’t network latency or GPU glitches — they're OOMs, GC stalls, or surprising allocations that trigger the worst user experience: a frozen WebView. If I can make our headless tests feel "memory‑tight", I get a chance to catch the worst breakages before a client demo.

What I built (short and runnable)
I keep a tiny wrapper that runs our Puppeteer/Playwright smoke script inside a Linux memory cgroup. You can do this on your laptop or a tiny VPS (I run it nightly on a ₹300/month VPS we already use for lightweight infra tests).

The idea is: run the exact same smoke flow we use for regular checks, but limit the process memory to mimic phones with ~300–500MB available to the browser.

Minimal example (what I actually used)
- My smoke test: scripts/smoke-flow.js (Puppeteer/Playwright script that signs in, navigates the critical page, interacts with the feature).
- Run it under systemd-run to enforce MemoryMax:

systemd-run --user --scope -p MemoryMax=400M node scripts/smoke-flow.js

Why systemd-run? It's simple, no extra packages, works on CI runners and cheap VPSes. You can also use Docker (--memory) or cgexec if you prefer.

What this buys you
- Real, deterministic failures: under 400M the browser process started thrashing memory and our client‑side cache code would throw a fatal uncaught exception. That exact uncaught exception manifested as the white screen in production.
- Cheap and maintainable: no need for five test phones. The VPS runs nightly and the same job can be run locally in 10 seconds for reproducing.
- Actionable signals: if the smoke test OOMs or the page throws, the stacktrace points to the offending allocation path. We were able to change the cache strategy (streaming instead of buffering) and reduce peak memory by ~30%.

A real failure and an honest tradeoff
This isn't magical. The first month we ran memory‑limited smoke tests, we got a steady stream of failures in CI. Many of them were real, but a worrying number were false positives.

Why? Headless browsers in a cgroup aren't the same as a WebView on a SoC. Headless Chrome can behave differently under low memory (different allocator behavior, different GPU usage). That produced two problems:

- Developer fatigue. A pre‑merge job that failed under 400M slowed down PRs and annoyed engineers. We made the mistake of running the memory‑limited job as a blocking pre‑merge check. That was a bad idea.
- Phantom bugs. A few failures only happened because of the combination of our CI environment and the memory cap, not because of real user flows.

How I adjusted (so it stays useful)
- Move it out of blocking pre‑merge checks. Now it's two things: a fast, unbounded smoke job that runs on each PR and a slower, memory‑limited smoke job that runs nightly and on-demand. Developers can run the memory job locally before a demo.
- Keep the test small and deterministic. Only the critical flow runs under memory limits — login, load critical screen, perform 3 interactions. The smaller the scope, the clearer the signal.
- Add matching diagnostics. When the memory test fails, collect a heap snapshot and the browser stderr. Those artifacts made triage far quicker and prevented repeated "noise" tickets.
- Thresholds, not absolutes. We analyze failures before auto‑failing releases. If three memory jobs fail in 24 hours, we pause the release pipeline. One-off failures need human confirmation.

The costs you accept
- It's extra maintenance. Heap snapshots and diagnosing memory problems takes time. Expect a few hours per real issue.
- It doesn’t replace real devices. Some vendor bugs and rendering glitches only show up on actual phones. We still keep one or two test phones for the most finicky issues (and for client demos when the stakes are high).
- It can slow CI if you mistakenly run it for every PR. Don’t do that.

Small, India‑specific notes
- If your user base skews low‑end Android (like many Indian consumer apps), conservative MemoryMax values make sense: I started at 400M, then trimmed to 300M for particularly memory‑sensitive flows. The ₹7,000 phone in that demo had ~1GB RAM but shared with background apps; realistically the available heap was often <500MB.
- Running this on a cheap ₹300/month VPS is enough for nightly runs; you don't need expensive runners. I used an existing VPS that lives in the same cloud region as our staging to keep network variance low.

What I walked away with
Memory‑limited smoke tests don’t replace device farms. They catch the kind of allocation mistakes and cache‑hogs that cry out in low‑end phones — and they do it cheaply. The posture that saved us was simple: run small, deterministic critical flows under realistic resource caps, collect diagnostics, and keep the signal out of blocking PR checks.

If you're worried about false positives, don't gate your PRs on this. Run it nightly, make it easy to run locally, and use the failures to guide surgical fixes — not to punish developers for noisy CI.