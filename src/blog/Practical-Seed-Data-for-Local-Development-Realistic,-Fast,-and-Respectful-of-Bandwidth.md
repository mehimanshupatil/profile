---
title: "Practical Seed Data for Local Development: Realistic, Fast, and Respectful of Bandwidth"
pubDate: 2026-03-09
description: "A practical playbook to create and manage realistic local seed data that saves dev time, respects privacy, and works on slow Indian connections."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=2000&h=1000&fit=crop"
  alt: "A laptop screen showing code and a terminal with a developer typing"
  caption: "Image credit: Markus Spiske / Unsplash"
  creditUrl: "https://unsplash.com/@markusspiske"
tags: ["seed data", "local development", "developer workflow"]
---

If you've ever sat waiting ten minutes for a Postgres dump to restore before you can reproduce a bug, you know the friction bad test data introduces. Conversely, if your local DB is a tiny, sterile set of rows that never hits the real bugs, you also know the other problem: false confidence.

I want to share a practical approach I use with small teams in India to keep local development fast, realistic, and safe. It combines compact samples, anonymised snapshots, and a couple of scripts so a colleague can spin up a working environment in under two minutes—even on a home broadband connection.

Why seed data matters (and what usually goes wrong)
- Real apps break on messy combinations of data: foreign-key gaps, soft-deleted rows, weird timestamps. Small synthetic sets miss these.
- Full production dumps are big (hundreds of MBs to many GBs), carry PII, and are a pain to move over unreliable home connections.
- Teams either accept slow restores or settle for meaningless fixtures. Both slow feature work.

My constraints
- Limited bandwidth and intermittent home internet (common for many Indian devs).
- Must avoid shipping PII or violating client confidentiality.
- Must be easy for non-DB people to use.

The playbook

1) Build a compact "golden snapshot"
Create a trimmed production-like snapshot: a dump with enough rows per table to reproduce edge cases (think 50–200 rows for most tables, 1–2k for high-volume ones like events). The goal: preserve relationships, common failure patterns, and realistic distributions (some users with many orders, many with none).

How I make it:
- Run queries on prod-like data (or a sanitized staging) that sample by diversity, not by size. E.g.
  - SELECT * FROM users WHERE random() < 0.01 OR id IN (SELECT user_id FROM orders ORDER BY created_at DESC LIMIT 100);
- Export schema and this sampled data into a dump (pg_dump --data-only --rows-per-insert + table list).
- Store the dump compressed with zstd (zstd -19) — much smaller and fast to decompress on low-end machines.

This "golden snapshot" becomes our canonical seed data.

2) Anonymise and enforce privacy
Never store real personal data in a repo or a shared bucket. Replace obvious PII with deterministic fake equivalents so tests remain consistent:

- Replace names with Faker but keep patterns: user_{{id}}@example.com or use domain-like emails.
- Hash or mask phone numbers leaving only the last 3 digits for realism.
- For addresses, use city-level consistency (Mumbai/Bengaluru) to keep geo-dependent logic working.

A small script that runs on the snapshot to re-map PII is worth its weight; it can be deterministic so different team members get the same seeded values.

3) Versioned, compressed artifacts stored cheaply
Store the compressed snapshots in object storage with versioning. For teams in India, S3-compatible providers or a small ₹300–₹600/month VPS with MinIO works fine. Keep one "latest" and dated versions for releases.

- Keep each snapshot <200MB for easy download.
- If you must include a larger edge-case dump, keep it separate and mark it optional.

4) One-command restore with a small bootstrapper
Make on-boarding a one-liner:

curl -sSLO https://my-bucket.company/golden.zst && zstd -d -c golden.zst | psql mydb

Wrap that in a shell script that:
- Stops local services,
- Clears the DB,
- Restores the snapshot,
- Runs post-seed scripts (create test accounts, set feature flags).

I added a tiny progress bar and retry logic because many devs on 4 Mbps connections face flaky downloads.

5) Keep a set of focused edge-case fixtures
Aside from the golden snapshot, maintain a folder of single-purpose fixtures for the weird stuff: a user with 10k orders, a payment failure sequence, or a multi-tenant conflict. These are small SQL files you can apply selectively when debugging.

6) Automate refreshes and prune drift
Schedule a weekly job that refreshes the golden snapshot from staging (not prod), re-runs anonymisation, recompresses, and uploads. Add a lightweight smoke test that restores the snapshot in CI to ensure the file isn't corrupt.

Tradeoffs and the messy reality
- You won't perfectly mirror production. The golden snapshot trades absolute parity for speed. Some scale-related issues still require a staging environment.
- Maintenance overhead: someone has to own the anonymiser and the refresh pipeline. Without ownership, snapshots get stale and less useful.
- Storage and network: even compressed, snapshots add artifacts to manage. Accepting that cost is part of the deal.

Tips that saved me time
- Use deterministic fake data: makes debugging reproducible.
- Prefer schema + small data over huge dumps—schema changes are often the real blocker anyway.
- Keep restore scripts idempotent so anyone can run them without fear.
- For CI, use a smaller variant of the snapshot to speed up tests, and keep the full snapshot for local debugging only.

When to reach for the heavy artillery
If you're debugging a production-only issue (race conditions under heavy load, rare data corruptions), you will need larger dumps or a staging environment that mirrors prod scale. Treat those as special cases—don't make every dev deal with them locally.

Conclusion
Good seed data is a balance: small enough to restore quickly on a slow connection, but rich enough to reveal real bugs. In my experience, a trimmed, anonymised golden snapshot plus a library of edge-case fixtures cuts the time to meaningful local debugging from tens of minutes to a couple of minutes. It's not perfect, and it needs a small maintenance habit, but it elevates every developer's day-to-day productivity—especially when your home internet decides to be temperamental.

If you want, I can share a starter anonymisation script and the sample queries I use to pick diverse rows.