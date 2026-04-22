---
title: "How I Cut Android Iteration Time with a ₹300 Remote Gradle Cache (and Where It Broke)"
pubDate: 2026-04-22
description: "How I set up a cheap remote Gradle build cache on a ₹300/month VPS to speed Android local builds over metered connections — and the real tradeoffs."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden desk with code editor visible on the screen and a coffee mug"
  caption: "Photo by Annie Spratt on Unsplash"
  creditUrl: "https://unsplash.com/@anniespratt"
tags: ["android", "build-system", "developer-tools"]
---

I remember the exact moment I decided enough was enough: sitting on a Bangalore balcony, hotspot tethered to my phone, waiting — for the 12th time that hour — for a clean build to finish because some dependency had to be fetched again. My mobile data meter blinked like a disapproving boss. My laptop fan sounded like an autorickshaw. Iteration time had become the bottleneck on every small UI change.

We already had a local cache for Maven/Gradle artifacts, but Android builds still recompiled a lot and fetched build outputs across machines (CI, colleagues, my laptop) every time caches missed. My work laptop and my CI were in different places. Sometimes I worked from home on a flaky ISP. Sometimes from a cafe where downloads were painfully slow. The obvious idea — a shared remote build cache — existed, but Gradle Enterprise or paid cache services were out of budget.

So I built one for ₹300/month. It shaved iteration time in half for the 80% of cases that matter. It also taught me exactly when such a setup helps, and where it creates new problems.

What I actually set up (short version)
- A small VPS in a nearby region — ₹300/month (I used a provider with a ₹300/mo plan; your mileage may vary). It had 2 vCPUs, 2 GB RAM, and 40 GB disk.
- MinIO as S3-compatible object storage. Small, simple, and easy to run on cheap VPS.
- Caddy as a TLS-terminating reverse proxy with basic auth (or use Tailscale if you don't want public endpoints).
- A tiny service that exposes a Gradle Remote Build Cache over HTTP using the S3 backend (I used the Gradle remote cache container image pointing to MinIO).
- Gradle config on my laptop and CI pointing to https://mycache.example.com/cache/ with credentials.

Why this worked faster than local-only caching
- Gradle's remote build cache stores compiled task outputs (dex, AARs, javac outputs). If my CI builds a feature branch, my laptop can reuse those outputs instead of re-running expensive tasks.
- The VPS is closer network-wise than pulling from Maven central or rebuilding locally — latency and throughput-wise, the difference mattered for many small files.
- Because the cache is shared across machines (CI, colleagues, my laptop), cache hit-rate rose quickly on active branches.

Concrete numbers (my experience)
- Cold build (clean) for our app: 8–10 minutes pre-cache.
- With remote cache warmed by CI: ~4–6 minutes on average on my laptop over home broadband, and sometimes under 3:30 on office LAN.
- For incremental builds the wins were smaller but noticeable: a 30–60 second reduction felt huge when making 20 tiny UI tweaks.

The tradeoffs and the week it failed me
This is important: it’s not a magic bullet.

1) Extra data egress and costs
I assumed a ₹300 VPS would be quietly cheap. It was — until a flaky CI job started thrashing the cache (a bad loop in a pipeline). Suddenly I was hitting bandwidth caps, and the provider throttled me for a few hours. The bill stayed small, but incidents like that made me add monitoring and rate-limits to avoid surprises.

2) Cache corruption / wrong artifacts
One morning my local build picked up a stale cached artifact that didn't match a local config tweak. The result: strange runtime crashes that were hard to debug. I learned to invalidate caches properly when changing toolchains (Android Gradle Plugin versions, Java versions). I added a simple header check in the cache to reject entries created by incompatible Gradle versions.

3) Availability is now a factor
Before, builds were local and always possible (slow, but possible). With a remote cache, if the VPS goes down, I fall back to cold builds. That happened twice during a provider maintenance window. I set up a health-check and a quick switch in gradle.properties to bypass the remote cache when it’s unreachable. You need that fallback script — or you’ll waste an hour blaming Gradle when the VPS is the real culprit.

4) Security and credentials
Exposing a build cache to the internet felt wrong at first. I considered IP whitelisting, but my laptop moves. I used mTLS for CI-to-cache and basic auth for laptops plus a short-lived API token rotated from a small script — simple, but not enterprise-grade. If you handle private build outputs that include secrets (don't), treat the cache like any other secret store.

Why I didn’t use fancy options
I tried the official Gradle Enterprise trial at work. It’s powerful. It’s expensive for a small team and felt like overkill for what we needed: faster local cycles. The DIY cache isn’t as feature-rich (no insights, no fine-grained access control), but it’s adequate for day-to-day iteration speed and fits a ₹300/mo budget.

A few practical gotchas I ran into
- TLS: Don’t skimp — let Caddy handle TLS and renewals. Self-signed certs are pain on mobile hotspots.
- Cache key mismatch: If Gradle config or AGP changes, you must flush the remote cache; otherwise you get subtle breakage.
- Warm-up requirement: The cache helps most if CI or another machine warms it regularly. On quiet branches you’ll often still get cold builds.
- Local disk still matters: The best results came when my laptop also had a decent local Gradle cache. Remote cache accelerates, it doesn't replace local caching.

How I use it now (my workflow)
- CI writes build outputs to remote cache on successful builds of main branches.
- My laptop reads from that cache on every build. If the cache is down or the hit-rate is low, I get a fallback to local build.
- I have a one-line alias to clear remote cache for a group (flush-cache feature) when a tooling change occurs.
- Monitoring emails me if egress spikes over a threshold.

The real takeaway
A cheap remote Gradle cache isn't a silver bullet, but it’s one of the few productivity investments that pays back in minutes per day. For small teams in India juggling metered mobile data and flaky home connections, a shared cache warmed by CI turns painful clean builds into "acceptable" waits and incremental edits into actual flow.

If you try this: plan for failures. Automate fallback to local builds, set egress limits or alerts, and make invalidation easy. I saved hours a week — and I also learned to stop blaming Gradle and start blaming bad health checks.

I still wonder: what would be the simplest, zero-maintenance service that gives the same hit-rate without a VPS? If someone has a good open-source hosted pattern I haven't tried, I'm genuinely curious.