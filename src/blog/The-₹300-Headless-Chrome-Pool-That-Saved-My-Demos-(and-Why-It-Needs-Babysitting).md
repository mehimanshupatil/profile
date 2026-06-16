---
title: "The ₹300 Headless Chrome Pool That Saved My Demos (and Why It Needs Babysitting)"
pubDate: 2026-06-16
description: "How I replaced flaky screenshot jobs with a tiny headless‑Chrome pool on a ₹300 VPS, the one upgrade that broke everything, and the few rules I now live by."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218360-6a3f7aaa0b2b?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop on a desk showing code and a coffee cup beside it"
  caption: "Photo by Clem Onojeghuo on Unsplash"
  creditUrl: "https://unsplash.com/@clemono"
tags: ["developer-tools", "testing", "infrastructure"]
---

It was 11:47 a.m. on a Tuesday and I was supposed to show screenshots of our checkout flow to the product team in a demo at noon. CI had mysteriously started timing out on the visual-tests job two days earlier. The runner logs said "Chrome crashed", then "OOM killed", then nothing. Someone was going to ask why staging looked different from production. I opened the console, felt my stomach drop, and started a manual browser session. Ten minutes later I still hadn't finished capturing the three screen states I needed.

That afternoon I stopped babysitting other people's machines and built something I could control: a tiny pool of headless Chrome instances on a ₹300/month VPS. It now handles our screenshots, PDF generation, and a few flaky visual tests. It saved me from a handful of last‑minute panics. It also taught me how fragile an apparently simple infra shortcut can be.

Why I needed a pool
Our problems were boring but real: CI runners are ephemeral, have small disks, and when dozens of jobs start Chrome at once they compete for RAM. We saw crashes, flakiness, and longed-for stability during demos. Running Chrome inside every test job also burned our CI minutes — a real cost for a small startup where every ₹ counts.

A central pool gives me:
- Single place to pin a Chrome binary and OS image.
- A memory‑controlled set of workers behind a queue (Redis).
- Stable rendering across runs, so visual diffs are meaningful.

How I built it (the fast, practical version)
I had three hard constraints: keep it cheap, make it resilient to slow office networks, and avoid bloated tools.

What I run: a small VPS (₹300/mo), Docker, a Redis queue, and N worker containers (N=3 by default). Each worker runs Chrome in headless mode inside a lightweight Docker image (Debian slim + Chrome) and exposes a JSON-over-HTTP RPC for jobs: navigate, waitForSelector, setViewport, captureScreenshot, return base64. A tiny Node.js dispatcher takes requests from Redis, hands them to an available worker, and retries on failure.

Key practical bits:
- Pin the Chrome package to a specific version in the Dockerfile (apt install chromium=xx). Don't trust "latest".
- Use --disable-dev-shm-usage and --no-sandbox (we accept tradeoffs here and firewall the VPS tightly).
- Limit worker memory with Docker --memory so one noisy page doesn't kill the whole server.
- Health checks: the dispatcher periodically runs a quick known-good page render to detect subtle breakages.
- Auth: all API calls use a short-lived HMAC token signed by a server secret stored in an encrypted SOPS file. The token rotates daily via a cron job on the VPS.
- Caching: static assets (CSS/JS) from staging are cached on the VPS for 30 minutes to avoid repeated downloads over our flaky office link.

Why this is better than "just run Chrome in CI"
- Faster turnaround (no repeating browser warm-up every job).
- Fewer false positives in visual tests — when Chrome versions don't jump between runs, diffs are meaningful.
- Lower CI minutes bill; the VPS cost is predictable and tiny compared to spikes in CI usage.

The week it broke me
I said earlier: pin the Chrome binary. I didn't do that strictly enough. One morning an unattended apt upgrade on the VPS pulled a new Chrome. The next CI run showed baseline screenshots with slightly different font rendering and spacing. The visual tests exploded. Worse, our dispatcher continued to hand out screenshots that looked "fine" to me locally — because my laptop Chrome was still the old version. The team spent a day chasing CSS kerning and blaming frontend engineers. I spent that day rolling back the VPS image and admitting I'd been sloppy.

That was my real failure: I cared about speed and simplicity more than reproducibility. The rollback cost me a full day of team goodwill and a new rule: immutable images + automated image builds. Now the VPS uses a pinned image built by our CI pipeline; the dispatcher refuses to accept worker registrations from untrusted Chrome versions.

Tradeoffs and real limitations
- Maintenance: it's “simple” but not zero‑ops. Kernel updates, Chrome CVEs, and disk fills need attention. I budget an hour a week for this. If you don't have that/time, this will rot.
- Security: running Chrome with --no-sandbox is a compromise. For us, the VPS is behind an office IP whitelist and the pool never renders pages that require real user auth tokens. If your screenshots need real sessions, don't use this without strong isolation.
- Edge cases: some pages render differently when loaded from the VPS's public IP (CDN geo rules, IP-based A/B tests). We stubbed third-party scripts where necessary, but that adds maintenance.
- Single point of failure: if the VPS dies, so does screenshot generation. We have a fallback: a minimal GitHub Actions job that runs one browser instance and human-run screenshots for critical demos. It’s slower, but it exists.

What I learned and what I actually take away
The pool is not about reducing work — it’s about shifting where the work lives. I traded flaky, repeated CI failures for a small, predictable maintenance task and one server that I own. That swap makes me calm before demos. It also forced better habits: pin binaries, bake images in CI, and never let sensitive data touch the renderer.

If you're tempted to replicate this:
- Start with one worker. Prove your queue and RPC model.
- Pin the browser and automate image builds.
- Add a daily health-check render that alerts you on visual drift.
- Assume you'll spend an hour a week on upkeep.

One takeaway to leave you with: if your tests are unstable because of the environment rather than your code, invest in a small, stable environment you control. It won't be free, but you'll stop explaining flaky demos to product every sprint.