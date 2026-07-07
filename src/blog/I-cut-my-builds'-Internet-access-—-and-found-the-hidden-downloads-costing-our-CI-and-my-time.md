---
title: "I cut my builds' Internet access — and found the hidden downloads costing our CI and my time"
pubDate: 2026-07-07
description: "I started running builds in a no‑network sandbox to catch hidden downloads. It broke many repos, saved CI minutes, and forced a small, honest tradeoff."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop on a wooden desk showing a code editor and terminal windows"
  caption: "Photo by Christina @ wocintechchat.com on Unsplash"
  creditUrl: "https://unsplash.com/@wocintechchat"
tags: ["builds", "CI", "developer-tools"]
---

The night a deploy failed because an external tarball server was down, I went into the usual mild panic — stack traces, frantic Slack pings, and a half-hour scramble to re-run jobs. The next morning we realised the same flaky external host was causing dozens of seconds of waste in our CI, multiple re-runs, and an occasional failed release. We were paying for every second.

That was the moment I stopped trusting builds that could reach the internet.

A small experiment
I added a single, tiny job to our pipeline: run the build inside a container with the network disabled. In GitLab CI it was docker run --network=none. Locally I used podman run --network=none or systemd-nspawn. The goal was simple: if the build succeeds with no network, no hidden external fetches are happening.

Within the first week it blew up.

What I found
- npm installs that piped through a postinstall script to curl some helper binary. Nobody had noticed — CI cached it until the cache expired and builds silently fetched it.
- A Makefile target that downloaded a binary tool on first run. Fine locally, not fine on CI when the host was rate-limited.
- A test suite that hit a telemetry endpoint during startup. No functional dependency, but long tail latency and flaky failures.
- A tiny script that used curl to pull an env file from a "convenience" URL. It was convenient — until the URL 502'd and PRs started failing.

Two practical consequences followed: our CI time dropped noticeably (fewer network waits and retries), and build failures caused by external outages vanished. More importantly, we stopped shipping surprises—runtime downloads that only showed up in production or on certain CI runners.

The exact rule I started enforcing
If a build or test needs the internet to succeed, it must be explicit.

Explicit means:
- The CI job that runs normally cannot reach the internet.
- A separate "bootstrap" job with a pinned cache and strict allowlist can run when necessary (for updating the cache).
- Any script that downloads things must be replaced with one of: vendored artifact, pinned dependency in the repo, or a documented bootstrap step that updates the cache.

This is not "no external dependencies ever" — it's "no implicit, silent downloads during normal builds".

How I implemented it (short, practical steps)
1. Add a no-network CI job
   - In each pipeline, add a sanity job that builds and runs tests with network disabled (docker/podman run --network=none or use a small VM without outbound access). It should be early and fast — it fails fast if something reaches out.

2. Make a developer flow for bootstrap
   - We created a bootstrap job that runs in a controlled environment and updates our internal cache registry (private npm registry, a small object store for binaries, or apt repo).
   - Developers run bootstrap when adding a new external tool — it’s explicit and documented in CONTRIBUTING.md.

3. Replace hidden downloads with cached artifacts
   - For node, we run npm ci using our private registry / Verdaccio, with the registry URL injected only in the bootstrap step.
   - For binaries, we checked them into a repo subfolder or stored them in an internal S3 bucket and referenced them via CI artifacts (not via curl at runtime).

4. Fail early and loudly
   - The no-network job is a gate. If it fails, the developer sees the exact stack trace and knows exactly which script attempted network access.

Why this actually helps in India
Our office internet is flaky and mobile data costs matter when I verify things on a hotspot. CI minutes are billed in INR as real pressure when you get many retries. Hidden network calls inflated both our invoice and my time. Once we blocked implicit external access, developers stopped blaming "the network" and started fixing the root cause.

The honest failure — and the tradeoff I didn't expect
I thought this would be frictionless. It wasn't.

- Onboarding got harder. New hires could not "git clone and run" until they ran the bootstrap job. I underestimated how often developers rely on internet convenience — especially interns or folks moving between multiple laptops.

- Build complexity increased. Maintaining a pinned cache or an internal registry is operational work. I had to write and maintain a small cache service and a script to refresh it. That's time I stole from feature work.

- We overblocked at first. My initial policy blocked DNS entirely, which broke license checks, internal telemetry and a few OSS tools that are supposed to contact home. I had to build a short allowlist for low-risk, necessary hosts (package mirrors for apt in an emergency, certificate revocation checks, etc.). That allowlist became a source of bikeshedding.

What actually changed my team's behaviour
Two things:

1) Visible savings: After a month, we tracked CI minutes and saw a reduction of ~18% (smaller for teams heavily using big integration tests). Developers also reported fewer flaky runs. When people saw the numbers in rupees on our billing dashboard, the bootstrap script stopped being a nuisance and became policy.

2) Concrete dev ergonomics: We automated the bootstrap for local machines. A one-time command (scripts/bootstrap-cache.sh) populates the local cache from our internal store, so new laptops work without manual fiddling. The trick is to make the "explicit bootstrap" as painless as possible.

When you shouldn't do this
If your project depends on fetching dynamic artifacts (like constantly-updated datasets), or you cannot afford the maintenance of a cache, this model will hurt you. Also, for very small one‑person projects, the overhead isn't worth it.

What I walked away with
Stopping implicit network access exposed sloppy assumptions we all had — little curls, unpinned downloads, and "works on my machine" conveniences. It forced explicit decisions: cache this, vendor that, or make the bootstrap step obvious.

The takeaway is not paranoia. It's a single lightweight rule: builds must succeed without the internet unless you intentionally opt into a clearly documented bootstrap flow. That rule costs some maintenance. It saved me time, reduced wasted CI rupees, and made our builds predictable — which, for a small team with limited ops bandwidth, is worth the tradeoff.