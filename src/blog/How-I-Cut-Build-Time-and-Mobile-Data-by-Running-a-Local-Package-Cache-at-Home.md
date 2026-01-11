---
title: "How I Cut Build Time and Mobile Data by Running a Local Package Cache at Home"
pubDate: 2026-01-11
description: "Run a local package cache to speed builds, save mobile/home data, and survive flaky networks—practical setup, tradeoffs, and India‑specific tips."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1527430253228-e93688616381?w=2000&h=1000&fit=crop"
  alt: "A small home server and laptop on a wooden desk, cables and drives visible"
  caption: "Image credit: Adeolu Eletu / Unsplash"
  creditUrl: "https://unsplash.com/photos/1527430253228-e93688616381"
tags: ["local package cache", "developer tooling", "devops"]
---

If you’ve ever watched a CI job stall downloading the same 600 MB of Docker layers or your laptop burn through mobile hotspot data while npm installs chug along, you know the pain. In India, where data caps, metered connections, and inconsistent home broadband are still common, that pain shows up regularly.

A local package cache—running a small proxy/cache server on your home network or cheap VPS—fixed that for me. It cut iterative build time, slashed repeated downloads, and made weekend work sessions less dependent on my ISP being “in the mood.” It’s not magic, but it’s practical. Here’s what I run, why it helped, and the tradeoffs you should expect.

Why run a local package cache
- Faster, repeatable builds: Artifacts downloaded once are served locally at LAN speeds next time. That matters for frequent dev loops and CI that runs on a machine inside your home lab or office.
- Lower data bills: If you’re tethering or on a limited broadband plan, a local package cache saves repeated bytes. In my case, repeated npm installs and Docker pulls were shaving multiple GBs daily.
- Resilience to flaky networks: Behind-the-scenes outages at registries or shaky ISP links become less painful when commonly used packages are cached.
- Predictable CI performance for small teams: For a 3–6 person startup, a single cache inside the office made builds consistent without paying for commercial caching tiers.

What I run (practical, low-cost stack)
- npm/yarn: Verdaccio (runs in Docker, tiny footprint). It acts as a registry proxy and stores packages you request.
- apt/ubuntu packages: apt-cacher-ng on a micro server for system updates.
- Docker images: A registry mirror (docker-distribution) or use registry-cache patterns; for many teams a private Docker Hub mirror works.
- Maven/Gradle: Nexus OSS or simple HTTP proxy with caching.
Hardware options that worked for me in India:
- Old desktop with a 256 GB SSD — ₹0–5,000 if you already own it.
- Raspberry Pi 4 + USB 3.0 SSD — around ₹5,000–8,000 total (useful for very small teams).
- Small VPS (₹300–₹800/month) if you want an always-on cache accessible from anywhere.

How I set it up (high-level)
1. One machine, Docker Compose: Verdaccio, apt-cacher-ng, and a small nginx reverse proxy. Docker makes upgrades painless.
2. Storage: Use an SSD and mount it for the package storage folder. Caches grow—give them room.
3. CI integration: Point CI runners (or GitHub Actions self-hosted) to the cache via registry or npmrc changes. For Docker, configure the daemon to use the mirror.
4. Local DNS: For convenience, create local hostnames (e.g., verdaccio.local) via your router’s DNS or a small dnsmasq entry.
5. TTL and eviction: Configure storage-limits and a policy to remove artifacts older than X months. I keep 30–90 day windows depending on project churn.

Concrete wins I saw
- Cold npm install on a fresh branch: dropped from ~90s to ~20s after the first cache hit.
- Repeated Docker image pulls on my dev laptop: from hundreds of MB per day to a few MBs.
- For a 4‑person team in Bangalore using a single cheap VPS mirror, monthly cloud egress dropped enough to justify the VPS cost within two months.

Tradeoffs and things that go wrong
- Maintenance overhead: You’ll need to patch and monitor the cache. Verdaccio/Nexus upgrades occasionally break plugins or auth. It’s not “set and forget.”
- Stale or missing packages: If someone pushes a new package version and your cache TTL is long, you might not see it immediately. I avoid very long TTLs for active repos.
- Storage and disk I/O: Caches can balloon. If you run Docker image caching, expect tens of GBs unless you prune aggressively.
- Security: You’re trusting a local mirror. Run minimal access controls and keep an eye on which packages are cached. For teams with strict compliance, a curated proxy (Nexus with a whitelist) is better than an open cache.

Practical tips from long use
- Start small: Run Verdaccio for npm first—most front-end dev pain is here. Add Docker/image caching next.
- Use an SSD and set up monitoring alerts for disk use. I trigger a prune when free space hits 20%.
- Configure clients to fall back to the upstream registry if the cache is missing an artifact; that avoids hard outages.
- For mobile hotspot usage, tether the cache host to your phone during big initial fetches so only the host pulls from mobile data, caches, and other machines use LAN.
- Document in your repo how to point to the cache (npmrc, .docker/config.json). Make onboarding painless.

When not to bother
- If you’re a solo developer with unlimited broadband and rare rebuilds, the setup time may not be worth it.
- If your team already has a managed caching solution from your cloud provider and you’re happy with costs and performance, self-hosting duplicates effort.

Bottom line
A local package cache is one of those small infra moves that pays back quickly for developers and tiny teams in India—especially if you care about iteration speed and data costs. It’s not a silver bullet: expect maintenance, disk management, and occasional surprises. But if your builds are noisy, network-dependent, or your team collides on the same heavy images and packages every day, a local package cache will feel like reclaiming a few minutes of your life every time you hit “install.”

If you want, I can drop a starter docker-compose for Verdaccio + nginx and the exact client config snippets I use (npmrc, Docker daemon config). Want that?