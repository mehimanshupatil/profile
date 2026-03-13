---
title: "Run a Cheap Private npm Registry and Save Time (and Mobile Data) in India"
pubDate: 2026-03-13
description: "A practical guide to running a lightweight private npm registry in India—faster installs, less mobile data, and predictable builds for small teams."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&h=1000&fit=crop"
  alt: "Developer laptop showing a terminal with package installs; a coffee cup beside it"
  caption: "Image credit: Unsplash"
  creditUrl: "https://unsplash.com"
tags: ["private npm registry", "developer tools", "devops"]
---

If your team in India spends a frustrating fraction of your day waiting for npm installs on flaky home broadband or burning mobile data to pull the same packages over and over, a small private npm registry changes the equation. I run a cheap, single‑VM Verdaccio instance for my projects and a couple of clients; it paid back in saved time and data within weeks. Here’s how I set it up, why it matters, and the tradeoffs you should expect.

Why a private npm registry helps (real, immediate wins)
- Faster local dev: Once a package is cached, installs are local—turns minutes into seconds on the same machine or across a team.
- Less data burn: For folks testing on hotspoted mobile data or with metered connections, caching big packages locally saves money.
- Deterministic CI: Pinning CI to your registry reduces the “works on my machine” surprises when upstream npm has a transient outage or throttling.
- Offline installs for travel or patchy connectivity: Your workstation can install dependencies even when upstream npmjs.org is unreachable.

What I actually run (minimal, pragmatic)
- Verdaccio: a lightweight, zero‑dependency registry designed for caching. It’s small, easy to configure, and works great for teams of 2–20.
- A small VPS: I use a ₹300–₹600/month VPS (think low-end DigitalOcean/Hetzner equivalent in INR terms) with 2–4 GB RAM and a 40–80 GB disk. Storage matters: node_modules can add up.
- Reverse proxy + TLS: nginx with Let’s Encrypt, or a Tailscale + SNI setup if you prefer zero public exposure.
- Basic auth + npm tokens: team members authenticate with npm tokens added to .npmrc or via CI secrets.

How it fits into our workflow (concrete)
- Developers point npm to the private registry in ~/.npmrc: registry=https://npm.mycompany.example/
- Verdaccio proxies unknown requests to registry.npmjs.org, caches responses, serves cached tarballs next time.
- CI uses the same registry URL+token. A small cache warm step (npm ci) after deployments ensures frequently used packages are cached before heavy builds.

Costs and rough numbers
- VPS: ₹300–₹600/month. Disk is the main factor if you cache many packages.
- Bandwidth: There’s still upstream bandwidth the first time a package is fetched, but subsequent team installs are local.
- Maintenance time: Expect 1–2 hours to set up, plus occasional housekeeping (rotate tokens, renew TLS, clear corrupted caches).

Real tradeoffs and things I learned
- Stale or broken caches: If an upstream package is re-published or the tarball is corrupted, your registry can serve a bad cache. You need a small clean-up process (verdaccio garbage-collect, or manual delete) and a protocol: if someone sees weird installs, clear cache for that package and re-fetch from upstream.
- Security surface: Running a registry adds a network service to your stack. Lock it down—HTTPS, auth, and IP rules if possible. Don’t expose it to the public unless you know what you’re doing.
- Private packages vs public caching: Verdaccio handles both, but if you rely on npm organization features, you’ll still juggle tokens and permissions. For some workflows, an official hosted solution (npm Enterprise) may be simpler despite higher cost.
- Disk growth: The cache grows fast if you let it. Set retention policies, or use a cron to prune unreferenced tarballs.
- Not a silver bullet for monorepos: Large monorepos with thousands of dev dependencies still need good package hygiene. A private registry helps but won’t fix poor dependency practices.

Practical tips that actually saved me headaches
- Pre-warm your registry before major CI runs: a small step that downloads your lockfile deps to the registry makes CI reliable.
- Use a shared cache directory for developers on the same LAN (if possible): saves duplicate downloads across laptops.
- Monitor cache hit rate: Verdaccio plugins or simple logs help measure how much upstream bandwidth you're actually saving.
- Automate TLS renewal and backups of the storage directory. I back up package metadata weekly and snapshot the VPS disk monthly.
- Consider a read‑only mirror for build farms: prevents accidental publishes from CI while keeping speed.

When not to bother
If you’re a solo dev with always-on, unlimited broadband, or your team uses predominantly private registries from paid vendors (and you already have good CI caching), the operational overhead may not be worth it. Also, if your dependency surface is tiny and stable, a simple package-lock + good caching in CI might be enough.

Bottom line
A private npm registry (set up with Verdaccio on a cheap VPS) is one of those small infrastructure moves that pays back quickly for Indian teams: faster local dev, less data burned over mobile hotspots, and more robust CI. It introduces a tiny operational responsibility—disk management, security, and cache hygiene—but for many small teams those are manageable. If you care about developer velocity and work with limited or metered connections, it’s a tool I’d put near the top of the “low cost, high impact” list.

If you want, I can share my Verdaccio config and the nginx snippet I use (with Let’s Encrypt automation) so you can replicate this in a weekend.