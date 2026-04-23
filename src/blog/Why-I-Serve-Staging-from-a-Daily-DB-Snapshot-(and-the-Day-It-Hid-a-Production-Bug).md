---
title: "Why I Serve Staging from a Daily DB Snapshot (and the Day It Hid a Production Bug)"
pubDate: 2026-04-23
description: "How I cut staging restore time from hours to minutes with nightly DB snapshots, the simple setup I use in Mumbai, and the one anonymisation mistake that taught me its limits."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=800&fit=crop&auto=format"
  alt: "A dimly lit row of server racks with blue indicator lights"
  caption: "Photo by Taylor Vick on Unsplash"
  creditUrl: "https://unsplash.com/@taylvick"
tags: ["infrastructure", "staging", "postgres"]
---

It was 8:30 a.m., the sprint demo was at 11, and I was watching progress bars crawl while someone on Slack asked whether the bug fix was actually in staging yet. We’d spent the last hour restoring a 200‑GB Postgres dump over our office’s flaky 40 Mbps upstream — the import alone had taken nearly three hours. I’d been doing that restore every week for months. That morning I decided enough: staging needed to be usable in minutes, not a morning ritual you schedule like a tarawih break.

Why a daily snapshot
I wanted two things: (1) fast restores so devs could spin up a fresh staging with a single command, and (2) realistic data so QA could find real‑world edge cases without poking production. Full point‑in‑time replicas were expensive for our small startup in Mumbai — a hot standby in AWS Mumbai means paying for a second DB instance and IOPS. Backups to S3 and pg_restore were reliable but slow over our network and during developer onboarding.

So I switched to daily, read‑only snapshots that are cheap to store and extremely quick to mount. The workflow:

- Take a compressed physical base backup nightly (pg_basebackup) and upload the compressed file to S3 (or an S3‑compatible minio instance if you prefer smaller VPS hosting).
- Keep the latest 3 snapshots on S3. Older ones are deleted automatically.
- For restoring staging, download the chosen snapshot to a local EBS volume, attach, and mount as a read‑only data directory. Start Postgres pointing to it in hot‑standby/read‑only mode.

This reduced a full “restore staging” from ~3 hours to ~6–10 minutes for the attach + service start. On the cost side, snapshot storage for a 200 GB DB in Mumbai ran us under ~₹1,200/month (we store only three day's worth compressed). Reattaching an EBS volume takes seconds; creating a fresh EBS snapshot of a volume is also fast and incremental.

The simple script I actually use
No Terraform. No fancy orchestration. A shell script that does three things:

1) Nightly pg_basebackup -> gzip -> upload to S3 with lifecycle to keep last 3.
2) Restore script: download chosen snapshot, create new EBS volume from it, attach to the staging instance (or create a t3.small EC2 in Mumbai for ephemeral staging), mount read‑only, start Postgres with recovery.conf pointing at the WAL archive.

I wrapped it in a tiny Makefile target so anyone on the team could run make restore-staging and get an invite to the staging DB in Slack. For local dev, the same snapshot can be downloaded and mounted with a loopback device — useful when internet is slow: download once, reuse multiple times.

Why it saved my team real time
- Developers stop blocking the CI pipeline waiting for a restore. One person can spin up a staging copy in minutes.
- The data is close enough to production that pagination, indexing hot paths and aggregate queries behave realistically.
- Cost/perf tradeoff is great for small teams: you pay for storage and occasional EBS attach API calls, not for a second DB instance running 24×7.

The tradeoff that actually bit me
We anonymised PII before uploading snapshots. The usual stuff: hash emails, obfuscate phone numbers, and replace real names. That felt responsible and was also a client requirement. Two weeks after rolling out snapshots, QA raised a bug: a payment reconciliation job would occasionally skip transactions with a certain pattern in the phone number field. The bug never reproduced in staging.

Why? Our anonymisation script normalised phone numbers into a short, same‑length token, and that removed the specific prefix pattern that triggered an edge case in the payment gateway integration. Production had those prefixes; staging didn’t. The bug only showed when the real prefixes were present. Because our staging snapshots were fast and convenient, we had fewer reasons to dip into production logs, and so the missing pattern hid the issue for longer than it should have.

We learned the hard way: making staging fast and “safe” by overzealous anonymisation can make it unrepresentative in the exact places that matter.

A practical fix (that you can copy)
- Keep a small, isolated “synthetic subset” of PII fields unmodified for a 1% sample of rows (behind extra access controls). We now retain realistic prefix patterns for a tiny, consented subset that QA can use for integrations.
- Add a “staging parity” checklist to every release: if a bug looks environment‑specific, pull a targeted production extract for repro (with approval), don’t rely solely on anonymised snapshots.
- Automate a quick parity check (10 queries) comparing distribution of important fields (phone prefixes, currency codes, country codes) between prod and staging snapshot before marking a restore “good”.

Constraints and honest failures
This approach isn’t a silver bullet. Three real constraints I ran into:
- Snapshot age: our nightly cadence meant very recent writes (last few hours) weren’t in staging. For some debugging we still needed a PITR or a quick logical dump.
- Storage costs scale with DB size. If you’re at multiple TBs, the storage bill and EBS attach times become nontrivial. For us, 200–400 GB was sweet spot; larger teams in Mumbai will need different tradeoffs.
- The anonymisation failure I described cost us two days of back‑and‑forth with compliance and one missed release window. It taught me to treat data realism and privacy as opposites that need a measured compromise, not an either/or.

Takeaway
Fast staging matters more than you think until it doesn’t. Nightly physical snapshots turned restores into a non‑event for my team and reclaimed hours that used to disappear into imports. But “fast” is not enough — you have to be explicit about which parts of the data you’re sanitising and why. Keep a tiny, representative slice of real patterns for integration tests; otherwise the convenience of instant staging will lull you into confidence while the real edge cases live in production.