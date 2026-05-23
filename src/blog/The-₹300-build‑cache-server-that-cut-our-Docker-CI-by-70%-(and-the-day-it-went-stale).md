---
title: "The ₹300 build‑cache server that cut our Docker CI by 70% (and the day it went stale)"
pubDate: 2026-05-23
description: "How I put a cheap ₹300 VPS in front of Docker builds to share BuildKit cache between CI and laptops — what sped up, what broke, and the tradeoffs worth knowing."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A developer's laptop on a desk with a terminal window open and small server hardware beside it"
  caption: "Photo by Christopher Gower on Unsplash"
  creditUrl: "https://unsplash.com/@christophergower"
tags: ["ci", "docker", "developer-tools"]
---

Friday, 11:42 PM. CI was green for every branch except mine. The pipeline hung pulling layer after layer from Docker Hub, timing out on our office connection. I sat with four teammates on a Slack thread, all running the same failing job. Each of us had a 30–60 second layer download; multiplied across dozens of builds a day it meant hours wasted.

We already had self‑hosted runners and cached node_modules, but Docker layers were a different problem: cold pulls from Docker Hub, flaky ISP routing, and rate limits. The obvious fix was "cache the build layers somewhere closer." The unglamorous answer I shipped: a ₹300 VPS acting as a private BuildKit cache server and lightweight registry mirror. It cut our CI build time by roughly 70% and saved a lot of painful retries. It also taught me exactly when this cheap fix breaks.

Why a cheap VPS works better than Docker Hub for us
- Proximity: the VPS was hosted on a nearby cloud region. Latency dropped from hundreds of ms to under 30 ms for our office and CI runners.
- Predictable bandwidth: we avoided throttles and public registry rate limits that hit us during peak hours.
- Shared cache: developers and CI could push and pull BuildKit cache snapshots (OCI cache/export) to a single place. Once a layer existed there, subsequent builds were almost instant.

What I actually built (short version)
- A ₹300/month VPS (1 vCPU, 1–2 GB RAM, 25–40 GB SSD).
- Docker registry (registry:2) with local disk storage and basic auth.
- Nginx reverse proxy with certbot for HTTPS.
- A tiny systemd service to rotate old cache tags (simple garbage collection).
- CI changes to use docker buildx with --cache-from/--cache-to pointing at the registry.

Key commands I used (conceptual; copy with care)
- Build and push cache from CI / laptop:
  docker buildx build --push --tag my-app:branch \
    --cache-to type=registry,ref=cache.mycompany.com/my-app:branch-cache,mode=max \
    --cache-label org.opencontainers.image.revision=$CI_COMMIT_SHA .
- Restore cache in a later build:
  docker buildx build --pull --tag my-app:branch \
    --cache-from type=registry,ref=cache.mycompany.com/my-app:branch-cache \
    --cache-to type=registry,ref=cache.mycompany.com/my-app:branch-cache,mode=max \
    .

How it changed daily life
- Local iteration time: I stopped waiting 40–60s for base layers. Rebuilds after code edits were single‑digit seconds.
- CI queue churn reduced: fewer retries for network timeouts; engineers stopped babysitting.
- Mobile data saved: when testing on my laptop over a hotspot (₹499/month plan), I didn't burn 100–200 MB per rebuild.

The failure I should have anticipated
Three weeks in, I forgot about one simple thing: cache staleness. We had a base image that pulled in OS security updates weekly. One Friday a security patch changed a base layer digest; our cache server still had the old layers. CI happily used the cached layers and produced images that skipped a crucial CVE fix. It went unnoticed until a staging scan flagged the vulnerability.

What happened technically: buildx cache is useful because it reuses layers even when the Dockerfile changes, but it only helps when layer digests match. If base images update upstream, relying solely on the cached snapshot breaks the expectation that "latest base = latest security fixes." The cheap VPS became a single source of truth that could be stale.

How I fixed it (and what I learned)
- Add an automated freshness check: nightly job that pulls the upstream base image, compares digests, and if changed, triggers a CI run that rebuilds and pushes fresh cache. This cost a single cron run and saved us from carrying stale bases.
- Implemented a graceful fallback: CI tries cache-first, but if a layer pull fails or the build exits non-zero with a "cache mismatch" hint, the pipeline falls back to pulling from Docker Hub and re-populates the cache.
- Set disk quotas + periodic GC: initially I let cache tags proliferate until the VPS disk filled. Garbage collection for registry:2 is awkward; I automated tag pruning by age + a weekly registry garbage collection run.

Tradeoffs that matter
- Maintenance vs savings: the VPS needed monitoring (SSL renewal, disk, GC). That's time my small team had to spend. For us, the saved dev-hours outweighed the upkeep. Your team size and build frequency will change the math.
- Security: running a registry means credentials to manage. We used short‑lived tokens and put the registry behind our VPN for write access, with read access restricted to CI and developer VPN users.
- Reliability: when the VPS had a brief outage, CI slowed down because it still attempted cached pulls before falling back. We added a health check so CI skips the cache if the VPS is unreachable.

Practical numbers (because you asked)
- VPS cost: ~₹300/month (we used a local provider with a nearby region).
- Build time before: 4–7 minutes for cold builds, 40–60s per repeated build step.
- Build time after: cold builds still need base pulls once in a blue moon; warm builds dropped to 60–120s; iterative rebuilds often <10s.
- Team time saved: for our 10‑engineer team running ~50 builds/day, it became a net saving of a few engineering-hours per day.

If you try this, start tiny
- Spin up a single small VPS.
- Run registry:2 and expose it over HTTPS.
- Configure one CI pipeline to export a cache tag and one to import it.
- Add a nightly freshness check for important base images.

What I walked away with
A ₹300 server won't replace good dependency hygiene or the need for secure images, but it turned an unreliable external system (public registry + flaky office net) into a predictable internal one. The rule I now follow: build cache solves iteration speed, but it must be actively refreshed and have a fallback. Cheap infrastructure buys speed, not absolution.