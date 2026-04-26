---
title: "Why I stopped running Postgres and Redis on my laptop for development"
pubDate: 2026-04-26
description: "I moved dev databases off my laptop to a tiny remote host (₹300/mo), cut iteration time, and learned the hard way about offline failures and data hygiene."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop at a wooden table with a coffee cup nearby"
  caption: "Photo by NeONBRAND on Unsplash"
  creditUrl: "https://unsplash.com/@neonbrand"
tags: ["developer-tools", "dev-infra", "india"]
---

I remember the afternoon I finally decided enough was enough. My 2018 MacBook Pro had spent the morning huffing through three local Postgres instances, a Redis server, and a dozen Docker containers. Every code change triggered a 30‑second wait while health checks spun up. CI passed, but on my machine I could make one change and walk to the tea stall before the test suite finished. My cycle time was a joke.

I was also the person who wanted "realistic data" locally. So I had a 2GB subset of production, which made every migration and local query feel like an episode of slow-motion. And in our Bengaluru office, with flaky internal VPNs and intermittent Wi‑Fi, I was wasting hours on simple tasks because my laptop kept swapping and thrashing disks.

I stopped. Not all at once, but over three months I moved Postgres and Redis off my laptop and onto a tiny remote host. The result was faster iteration for everyday work and far fewer environment headaches. It also introduced a new class of failure — one that bit me enough to change the setup again. Here’s what I did, why, and the tradeoffs.

Why I moved databases off my laptop
- Disk contention kills creativity. On my laptop, DB processes competed with the editor, browser, and Docker builders. Fan noise went through the roof; so did swap. Moving ephemeral but heavy services off my machine freed I/O and CPU for what I’m actually doing: writing code.
- One source of truth. Our team had a dozen ways to run the DB locally, each with slightly different configs. We’d waste time debugging “it works on my machine” differences. A single remote dev DB eliminated that class of differences.
- Real-ish data without the weight. I kept a daily, scrubbed snapshot on the remote host. It’s not full production, but it’s realistic enough to exercise indexes and query plans without a 30‑minute restore on my laptop.
- Cheap and stable. I rent a small VPS for dev infra — a basic 1 vCPU, 1GB RAM instance with an SSD for ₹300–₹500/month. It’s on the same cloud region as our CI, so latency is acceptable and uptime is far better than my laptop.

How it’s wired (practical and blunt)
I use Tailscale for access (we’re a small team and didn’t want to fight corporate VPN policies). The VPS runs Postgres + pgbouncer + Redis. Nightly cron jobs pull a scrubbed production dump, load it into a separate schema, and rotate it. My local environment points to the dev host via DB_HOST and REDIS_HOST env vars when I’m in “remote mode”.

Pgbouncer is the secret sauce — it keeps connection count sane and makes the remote DB behave like a local one. I also keep a tiny, in‑repo SQLite fallback for unit tests so I can run a subset of tests completely offline (more on that below).

What actually changed for my day-to-day
My edit→test cycle dropped from 30–40 seconds to often under 5, because my laptop no longer hit the I/O wall. Docker builds were faster. Code that interacted with the DB felt reliable: no weird "localhost vs 127.0.0.1" surprises, no stray processes holding ports. New devs cloned, ran a single bootstrap script, and were pointing to the same dev DB within 10 minutes.

A practical benefit nobody warned me about: battery life improved. Less disk thrash = less power draw. That matters when you’re slogging through a late-night deploy on train Wi‑Fi.

The day it failed (and why it mattered)
Two weeks after we moved, Bangalore had a partial fiber outage in my area. My home Wi‑Fi was down for five hours. I opened my editor, tried to run the test suite, and was stuck. The remote DB was unreachable. My fallback? I had to cobble tests to run against the tiny in‑repo SQLite copy. That worked for unit tests, but a whole class of integration checks — migrations, complex JSONB queries, connection pooling behaviour — were invisible.

I’d ignored one obvious constraint: patchy connectivity in Indian metros and frequent VPN policies at client sites. For three days afterwards I split my workflows:

- Keep the remote setup for day-to-day work and integration testing.
- Maintain a small, locally runnable dev DB image for emergency offline work. It’s a trimmed-down Docker image with a minimal schema and a few rows (not real data).
- Use fast schema migrations and smaller fixtures for offline development so I don’t have to spin up big dumps.

That outage changed my mentality. Moving services off your laptop helps speed — but not if you can’t reach them.

Security and hygiene I wish I’d done earlier
I learned the hard way that “cheap and accessible” often becomes lax. Initially, the VPS had an open SSH port and pgbouncer was misconfigured. We fixed it: firewall rules restricting access to Tailscale IPs, rotated DB passwords monthly, and enforced a scrub script for nightly snapshots (strip PII, anonymize emails/UPI ids, remove large blobs). If you’re copying production data, assume compliance questions will come. Address them early.

Tradeoffs you should accept
- Latency vs CPU: remote DB adds a few milliseconds per query. For most code, that’s a non-issue. For low-latency tight loops, you’ll have to profile and sometimes run a local optimized instance.
- Offline resilience costs effort: keeping a small local DB image and SQLite fallback adds maintenance. It's worth it.
- Trust and data: realistic snapshots are great, but they require automation and hygiene. Ignore this and your VPS becomes a compliance liability.

If you want to try this quickly
Bootstrap with a ₹300–₹500/month VPS, install Postgres and pgbouncer, set up a Tailscale ACL, and automate a nightly scrubbed dump. Use environment flags to switch between LOCAL and REMOTE modes. Add a tiny SQLite fallback for unit tests. Test the “offline” case once a month by unplugging your Wi‑Fi and forcing yourself to work with the fallback.

What I walked away with
My iteration time improved in ways I could measure — fewer distractions, faster builds, less thermal throttling. But the bigger lesson was about tradeoffs: optimization for speed revealed an availability blindspot I’d ignored. Cheap remote DBs are a net win for a small team in India, so long as you accept the extra work to make offline development and data hygiene first-class citizens.

I still prefer the remote setup for most work. But now I carry an honest fallback: a tiny local DB image, an SQLite test suite, and a mental checklist to expect outages. That combination feels realistic for Indian work environments — fast when the net is good, and survivable when it’s not.