---
title: "A one‑line kill switch for feature flags (and the release it saved)"
pubDate: 2026-07-29
description: "How I implemented a single authoritative kill switch for risky features across services — the simple design, the ₹300 tradeoffs, and the time it failed me in production."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop at a cluttered desk with a coffee cup"
  caption: "Photo by Scott Graham on Unsplash"
  creditUrl: "https://unsplash.com/@scottgraham"
tags: ["feature-flags", "reliability", "ops"]
---

It was 2:14 a.m. and payments were failing in production. Not a trickle. A cliff. Our SRE channel blew up, the PM was awake, and the rollback pipeline refused to finish because of a stale migration lock. We needed an emergency off switch that cut the risky code path—across three microservices—without touching deploys.

We had feature flags, of course. But flags lived in different places: one service read flags from Postgres, another from a local cached file, and a third used an in‑memory config that synced once an hour. The inconsistency meant our "turn feature off" dance took 20 minutes and three shell sessions across three machines. I wrote the kill switch that night. It’s one line in each service and, crucially, one authoritative place to flip it.

Here’s what I actually built and why it’s stayed in our toolkit.

## The one‑line idea (and why one authoritative source matters)

The code was trivial:

if not feature_enabled("payments:new_checkout"):
    run_old_checkout()

That feature_enabled call does three things, in this order:
1. Check a tiny local cache (TTL 1s) for the current flag version.
2. If cache miss, read a single Redis key: global:flags:version
3. Compare local version to Redis version and, if different, fetch the JSON blob from Redis at global:flags:data and update local cache.

Put simply: one Redis key that holds a version id, one Redis hash (or string) holding the entire flag payload. Every service checks the version first. Flip the version and publish a Redis PUBLISH event; services update within a second or two. No per‑service stores, no inconsistent caches by accident.

Why this works: you avoid scattershot flag sources. You avoid slow polling from sixty services. One store means one authoritative source to audit and protect.

## How I actually flip the switch

I didn't want the ops person to ssh into every host. I put a tiny admin endpoint on a hardened box (initially a ₹300/month VPS before we moved to managed infra). Endpoint requirements:
- Basic auth + client IP allowlist (office VPN + specific SRE IPs).
- A two‑step UI: stage the change, confirm it after a 10s delay.
- An audit log (append only) pushed to a Slack channel via a webhook.

Flip flow: admin posts updated JSON → server writes new data to Redis with an incremented version → PUBLISH "flags_update" with version id → services receive event and refresh local cache.

Pub/sub is the secret sauce. Without it, TTLs force longer delays or noisy polling.

## The tradeoffs and the time it failed

It’s not perfect. My honest failure:

Two months after shipping, during a traffic spike (₹40 lakh checkout hour for a partner promo), someone in the morning stand typed "global:flags:data" when they meant "global:flags:payments:data" into the admin UI and hit confirm. There was no additional validation for schema. The JSON blob was malformed. Redis accepted it, the version incremented, and every service refreshed to the broken payload. Payments went down for 22 minutes while we rolled back the blob and fixed the admin validation.

What I learned the hard way:
- Single point of truth works only with strong input validation.
- A cheap admin UI with one button is fast, but dangerous.
- Redis is central here—if Redis is slow or partitioned, the kill switch itself can be slow or unavailable.

We fixed it by:
- Adding JSON schema validation on the control plane (the admin endpoint rejects malformed blobs).
- Making the confirm step require typed confirmation (enter the flag name) to reduce fat‑finger incidents.
- Adding a read‑only fallback: when Redis is unreachable, services keep the last known good version and reject any zero‑state payload.

We also eventually moved from a ₹300 VPS to a small managed Redis because the cheap VPS was the other weak link: its network flapped during a DoS attack and our kill switch was unreachable. Cost went up by ~₹3,000/month but saved us an on‑call night later.

## Security, latency, and Indian infra realities

A few practical choices I made because we operate from Bengaluru and sometimes on shaky office connections:
- TTLs are 1s for local cache. With Redis pub/sub that’s enough. On slower links I would not drop TTL lower than 3s.
- The admin UI sits behind a VPN + IP ACL. We also require 2FA for the few people who can use it.
- We log every flip to a Slack channel (the channel has an Ops bot that records who confirmed). That audit trail is more useful than formal tickets when you have delayed salary days and someone is filling gaps at 11 p.m.

Also, feature toggles are not a substitute for rollback plans. The kill switch is to mitigate damage fast. It buys you minutes. Not hours. Not a replacement for good deploy hygiene.

## What I still worry about

- Redis as the single source: it’s fast, but if Redis is flaky we need a fallback. We added an S3 (or object store) backup of the last good flags file that services can read if Redis is down. It’s slower (10s), but better than chaos.
- Complex flags: per‑user or per‑region flags don't fit the single global pattern. We keep those out of the kill‑switch mechanism. The kill switch targets risky global code paths.
- Human error: the UI needs continuous improvement. We accidentally made it easier to break than to fix once. Guardrails matter more than cleverness.

Takeaway (what I actually walk away with)

Simple beats clever. A single authoritative flag store + pub/sub + a lockable admin endpoint gave us consistent, sub‑second ability to cut a risky path across services. But simplicity comes with responsibility: validation, audit, and a fallback plan are not optional. Treat your kill switch like a production control — test it on low‑traffic days and make sure it can be flipped by someone half‑asleep without causing a worse outage.

When was the last time you tested yours?