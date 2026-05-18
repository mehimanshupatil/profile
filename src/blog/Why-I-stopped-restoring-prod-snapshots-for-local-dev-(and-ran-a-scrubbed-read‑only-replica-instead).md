---
title: "Why I stopped restoring prod snapshots for local dev (and ran a scrubbed read‑only replica instead)"
pubDate: 2026-05-18
description: "Restoring prod DB snapshots on laptops ate hours, risked leaks, and broke onboarding. I built a scrubbed, read‑only replica developers can query — here’s what I actually spent and where it still fails."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden desk with a coffee cup, notebook and code visible on the screen"
  caption: "Photo by Annie Spratt on Unsplash"
  creditUrl: "https://unsplash.com/@anniespratt"
tags: ["developer-tools", "databases", "devops"]
---

It was 10:30 pm, my home Wi‑Fi was doing its usual tantrum, and a new hire pinged asking for a full DB restore so they could debug a production‑only report. The dump was 22 GB. Their hotspot had 4 GB left. I could hear the clock tick.

We'd been doing this dance for months: someone needs a copy of production, someone else grants S3 access, someone else runs pg_restore for an hour, then we scrub the most obvious PII and pray no secrets leak to Slack. It cost time, bandwidth, and patience. And because we were all human, something leaked eventually. One engineer once left a CSV in a public temp link for three hours. I don't want to relive that night.

I stopped saying "okay" and built a different problem: a scrubbed, read‑only production replica that our devs can query over a tunnel. It didn't fix every case, but it replaced 80% of local restores and eliminated the ridiculous GitHub‑paste‑of‑PII incidents.

What I wanted — and why restores failed
- Restores are slow. A 20–30 GB logical restore on a developer laptop (even SSD) plus indexes takes 30–90 minutes. Over mobile tether it’s days.
- Restores are leaky. Dump + restore workflows encourage copying CSVs, emailing reports, pasting rows into Slack.
- Restores are fragile. Every schema migration, every sequence mismatch, every extension gap turns a restore into a debugging rabbit hole.
- Restores are wasteful. Multiple devs doing the same heavy lift repetitively burns compute and time.

The solution I shipped (practical, cheap, and boring)
I provisioned a small managed Postgres as a read replica of production and put a scrubbing pipeline between the replica stream and the dev endpoint.

Short version of what it looks like:
- Production publishes WALs. A logical replication slot feeds a dedicated staging DB.
- A small worker runs every few minutes and masks sensitive fields: email -> user+<hash>@example.com, phone -> 91xxxxxxx, name -> "User_<id>". We also drop attachments, free‑form KYC blobs, and anything flagged as sensitive.
- The staging DB is mounted as read‑only to the dev endpoint. Developers connect through an SSH tunnel (or Tailscale) and a pgbouncer instance handles connections.
- Exports are blocked at the DB user level (no COPY TO allowed), and we log any large queries for review.

How much it cost me
- DigitalOcean Managed DB (db-s-1, small replica): ~₹1,200–1,800/month depending on region and backups.
- A tiny droplet for the scrubbing worker + pgbouncer: ~₹300–₹500/month.
- Bandwidth for WAL shipping: cheap unless you have very high transaction volume — on our traffic it added another ₹200–₹400/month.

So total: ~₹1,700–₹2,700/month. For our team of 10 devs that number bought us 20–30 hours/week of reclaimed time and one less panic about accidental leaks. If you have a bigger org, you'll pay more; if you already use managed read replicas, this is mostly a copy+scrub job.

Why this actually made developers happier
- Fast, queryable data without restores. A new hire opens a tunnel, runs a few SELECTs, and starts debugging in minutes.
- No sensitive data in Slack/drive/email. The most common high‑risk leakage mode disappeared.
- Fewer local environment mismatches. The schema is the same; we don't have older local copies causing "works on my laptop" excuses.

The failure that taught me the most
Three months in, we missed a production bug. It was a write path race condition that only happened when a particular field was non‑null with a specific pattern. Our scrubbing pipeline zeroed out that column for privacy. Because the replica was scrubbed and read‑only, nobody could reproduce the failure locally and we spent two days chasing a ghost until we discovered the scrub rule.

Two hard lessons:
- Scrubbing can change program behavior. Never scrub fields that drive business logic without flagging them conspicuously.
- Read‑only replicas hide write‑side timing and locking bugs. You still need targeted restores for reproducing complex, write‑heavy issues.

Operational caveats I learned the hard way
- Replica lag is real. Heavy reporting queries on the dev replica can increase lag; I limited long‑running queries to a different user and introduced query timeouts.
- Exports must be prevented at the DB level. We learned this when someone with a cursory knowledge of psql used \copy to pull a table — so I revoked privileges and monitored.
- Legal/Compliance still matters. Our PII policy forced me to document the scrub rules and keep an approval flow for exceptions. That meant the replica couldn't be a free‑for‑all; it needed governance.

When to still do a full restore
- If you need to reproduce a migration that modifies write behavior.
- If you need to profile a heavy write throughput scenario or race conditions.
- If you must run a data‑integrity script that needs precise original values (request an approved short‑lived snapshot for that case).

What I actually walked away with
The replica didn't replace all restores. It replaced the repetitive, time‑wasting, risky ones. For the cost of a daily coffee per developer (₹150–₹250/month), we removed the worst parts of prod snapshot chaos: slow restores, data leaks, and onboarding friction. But it also forced us to write stricter rules about what counts as "dev data," and to accept that some bugs will always need a carefully controlled full snapshot.

Takeaway: if your team is still running ad‑hoc prod restores for routine debugging, build a scrubbed read‑only replica first. It'll save hours and reduce privacy risk — but remember to keep a playbook for the few cases that genuinely need a full, writable snapshot.