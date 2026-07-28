---
title: "Why I built a tiny log‑anonymizer to replay production traces in staging (and the day it failed)"
pubDate: 2026-07-28
description: "How I built a simple pipeline to scrub and replay production logs in staging so bugs are reproducible — the leak we found, why regexes aren't enough, and the maintenance tradeoffs."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a table with code visible on the screen and hands typing"
  caption: "Photo by Mitchell Luo on Unsplash"
  creditUrl: "https://unsplash.com/@mitchellluo"
tags: ["observability", "developer-tools", "privacy"]
---

It was 2:10 a.m. My co‑founder pinged me with a stack trace that only appeared when a real user flow hit our payments gateway. Devs could not reproduce it locally because the production logs had the user context we needed — and our legal team would not let us copy raw logs to staging.

We had two choices: try blind guesses at reproducing the chain of calls, or give the team better input without handing them raw PII. Guessing lost. So I built a tiny log anonymizer and replay pipeline that changed how we debugged payment flows. It cost me a weekend, a ₹300 VPS, and a hard lesson about base64.

Why I needed more than sampling or redaction

We already sampled logs and kept structured traces in S3. But sampling loses context across services. Full logs are noisy, and legal says: don’t give developers direct access to phone numbers, emails, or payment tokens.

Redaction libraries exist. But our logs were a mix: JSON traces, middleware logs with quoted JSON, and occasionally entire payloads base64-encoded (legacy microservice that saved blobs). A naive regex on "email=..." will miss those. Worse, redaction that strips fields breaks trace joins — hashes of user IDs were used for correlating across services.

So I set three practical goals:

- Remove or replace any PII (emails, phones, tokens) so legal is comfortable.
- Preserve correlation keys and timing so traces are useful.
- Make the pipeline cheap, auditable, and fast enough that a developer can pull a 1‑hour slice into staging in under 10 minutes.

What I actually built (short and practical)

I kept it minimal: a streaming scrubber + a small store of scrubbed slices.

Components

- Shipping: production log stream goes to our central S3 bucket (existing); lifecycle keeps 30 days.
- Scrubber: a small Go binary that reads NDJSON files from S3, normalizes entries into JSON, applies redaction rules, and outputs gzipped NDJSON to a scrubbed-bucket.
  - Rules are JSON-path driven. For fields we can drop, we remove them. For identifiers we need for correlation, we replace with HMAC-SHA256 using a secret key in AWS KMS. That keeps joins possible without exposing raw values.
  - For everything else, we canonicalized strings and applied conservative regexes for emails, phones, PAN-like patterns, and UPI IDs.
- Replay store: scrubbed files are kept by timestamp and partitioned by trace-id. Developers use a small CLI that takes a trace id or time window, downloads the scrubbed slice (rclone + gzip), and loads it into staging MinIO and the staging service's local trace index.
- Safety: any log line that fails parsing or contains base64 fields is flagged and quarantined. The pipeline alerts to Slack and refuses to forward quarantined slices until reviewed.

Why HMAC instead of hashing or removing fields

When you remove a user_id field, traces lose correlation. Plain hash is reversible if an attacker gets the salt. HMAC with a KMS‑backed key gives us deterministic pseudonyms we can revoke (rotate keys) and an auditable KMS access history. It cost us no more than a few API calls and some cheap cryptography.

The day it failed (and the real cost)

Two weeks after deploying, we got an alert: a scrubbed slice had a raw email visible. It came from a nested base64 payload. A service stored an encrypted/encoded blob (for legacy reasons) that contained user profile JSON. Our scrubber decoded nothing. The root cause: we assumed JSON or plain text.

The realistic tradeoffs:

- Fix: I added a conservative decoding step — try base64 decode, then try JSON parse, then apply normal rules. That caught 90% of the cases, but I also added a quarantine rule to block any file containing patterns that match PII even after attempted decode.
- Cost: we sacrificed speed for safety. Decoding and parsing blobs added CPU, which increased our VPS bill and S3 egress a little. Total monthly cost landed around ₹400–₹700 extra (S3 small egress + VPS), plus a one‑time development weekend.
- Limitations: this pipeline is not suitable for PCI data or raw card tokens — those must never leave the payments vault. Also, it is not perfect: if a service starts using a new encoding or embeds PII in images or compressed blobs, the scrubber will miss it until rules are updated.

Maintenance I accepted (and what I automated)

I didn’t want this to become another "works on my laptop" tool, so I automated three things:

- Unit tests: every redaction rule has sample inputs and expected outputs. The scrubber fails CI if a change would expose a pattern.
- Canary slices: every morning, a small pre-approved slice is scrubbed and compared with a golden file. Any diff triggers a review.
- Rollback panic: one command stops forwarding new slices to scrubbed-bucket and deletes the latest scrubbed files (after audit) — useful if we ever get a repeat leak.

Why teams in India should care

Two realities make this practical in our context: 1) bandwidth is precious — pulling a scrubbed 30‑minute trace as gzipped NDJSON is cheaper than shipping full logs, and 2) legal/contract obligations with Indian banks and PSPs mean you cannot be careless. The cost is small: a ₹300–₹1,000 monthly hosting/egress cost beats a compliance headache.

One honest constraint: it added friction to small bug hunts

This pipeline made big, tricky reproductions easier, but for quick developer experiments it added friction. Instead of "grab prod log" you now have to request a scrubbed slice or run the CLI. That friction is intended, but it slows the quick & dirty debugging loop. We accepted that tradeoff: if you want raw data you go through a documented process and an audit.

What I walked away with

Good redaction is not a single regex; it’s a set of conservatively auditable transformations plus a quarantine for anything unfamiliar. If you need production fidelity in staging, build a tiny, testable scrubber that preserves correlation keys (HMAC them) and blocks everything that doesn’t parse. Expect to invest a weekend, a small VPS, and ongoing rule updates — but you’ll save hours on bug hunts that otherwise turn into guesses.

If you try this, start with a single service and a single two‑hour window. Add tests. Add the panic button on day one. And plan for base64.