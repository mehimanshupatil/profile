---
title: "A ₹300 read‑only Postgres replica that made staging usable (and the scrubber that almost cost us privacy)"
pubDate: 2026-06-24
description: "How I set up a cheap, read‑only Postgres replica on a ₹300 VPS to speed up staging queries, what it fixed, and the scrubber mistake that taught me where it fails."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk showing code in a dark-themed editor, with a coffee cup and notebook nearby"
  caption: "Photo by Glenn Carstens‑Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["developer-tools", "databases", "devops"]
---

It was 9:12 a.m. and half the squad was in my Slack asking why every staging query was timing out. A data analyst wanted a 30‑row report. The frontend engineer wanted to reproduce a sorting bug. Our staging DB—an overloaded RDS instance—had the throughput of a sleeping dog. Every restore-from-snapshot took 45 minutes, and nobody wanted to wait.

I got tired of babysitting restores. So I built a cheap, read‑only replica on a ₹300/month VPS, scrubbed the data nightly, and tunneled queries to it. It took a long weekend and a mistake. Here's what actually happened, how I did it, and the one failure that forced me to rethink assumptions.

Why a cheap replica, not more snapshots
Snapshots are fine for exact-state testing, but they’re heavy:
- Restores are slow (45–60 minutes for us).
- They hammer production if you trigger exports carelessly.
- They don't help interactive debugging; you wait, then run a query, then wait again.

A streaming or physical replica that's scrubbed and mounted read‑only solves the common case: fast, safe, low‑risk reads for devs and analysts. It’s not perfect (you can't do destructive writes), but for 80% of staging use—queries, explain plans, reproducing SELECT bugs—it’s huge.

What I actually ran: the stack and costs
I did the minimum that works:
- VPS: ₹300/month (small VM with 1 vCPU, 1–2GB RAM, 40GB disk). You can use any cheap droplet or an Indian provider’s equivalent.
- Postgres 14 installed on the VPS.
- Streaming replication from staging → VPS using pg_basebackup + WAL streaming.
- recovery.signal + primary_conninfo on the replica to keep it following the primary.
- A small SQL-based scrubber that runs after the base backup completes: replaces PII with deterministic hashes or synthetic values (pgcrypto’s digest and random masking).
- systemd timers to trigger a nightly base backup + scrub cycle. Full cycle: ~20–30 minutes for our ~20GB DB.
- An SSH tunnel and pgbouncer on the VPS to let developers connect without exposing the DB publicly.

Total build time: ~6–8 hours spread over a weekend. Monthly cost: ₹300 for VPS + incidental bandwidth (₹200–₹500/month, depending on your provider and how many dumps you transfer).

Why it mattered
Within a week:
- Queries that used to stall on staging ran instantly on the replica.
- Debugging loops tightened: developer edits → query the replica → iterate by the hour instead of by the half-day.
- We stopped doing one-off restores for quick checks. That saved about 8 restore operations a month, each previously costing us time and an SRE’s attention.

Operational niceties that helped:
- Make the replica read‑only at the Postgres level (default_transaction_read_only = on + a no‑superuser policy).
- Use deterministic masking for repeatable test data (same user ID maps to same fake name).
- Add a small /status endpoint on the VPS to show when the last scrub was run and how far behind replication is.

The failure: the scrubber that wasn’t enough
After a month of bliss, we shipped a change that sent an SMS to users on certain triggers. During a load test against staging we accidentally hit a specific path that triggered real message sends. A few real numbers—users who'd never opted into test environments—got pinged. It was ugly.

Root cause: my scrubber focused on obvious PII columns (email, phone, name) but not derived fields or queued payloads. Copies of JSON blobs containing phone numbers existed in audit tables and Kafka‑backed staging queues. When my scrubber replaced the canonical phone in users table, those blobs remained untouched.

Lessons from the mistake:
- Scrubbing must be holistic. Schema‑level masking isn't enough if your app stores or derives PII elsewhere.
- Test the scrubber by simulating end‑to‑end flows (including queues and third‑party integrations), not just inspecting tables.
- Always have a "no‑hooks" policy in staging: block external integrations (payments, SMS, email) by default. We implemented a global flag and tenant‑level routing to a sandbox provider.

The unavoidable tradeoffs
- Writes: You can’t test write-heavy or schema-migration flows on a read‑only replica. For those, snapshots or a disposable writable clone are still necessary.
- Consistency: Streaming replication can lag. For near‑real-time testing you’ll see up to a few seconds/minutes delay depending on WAL shipping and the VPS network.
- Security & compliance: If your product handles sensitive financial or health data, even scrubbed replicas may violate policy. I stopped using this approach for a vertical with stricter rules and switched to synthetic seed data.
- Maintenance: Nightly base backups + scrub scripts are another thing to keep green. If they fail unnoticed, your "safe" replica can quietly become stale or unsafe.

What changed after the incident
- We added a forced sandbox layer: any external integration in staging defaults to a disabled or mock mode. No real SMS/cards unless explicitly enabled by a senior engineer for a verified test account.
- The scrubber got a test-suite: a set of automated checks that assert no emails/phones remain in any table or JSON blob.
- We limited which teams could tunnel into the replica. Developers still get fast reads, but access is audited.

One takeaway
If your pain point is "staging is slow for read debugging," a cheap read‑only replica is the most practical fix I’ve used: cheap to run (₹300/month), fast to set up, and it reduces friction for day‑to‑day work. But don’t stop at column masking—scrub everything that can become a payload, and treat integrations as first‑class tests. The replica saved us dozens of wasted hours; the scrubber lapse reminded me that "safe" is a property you must test, not assume.