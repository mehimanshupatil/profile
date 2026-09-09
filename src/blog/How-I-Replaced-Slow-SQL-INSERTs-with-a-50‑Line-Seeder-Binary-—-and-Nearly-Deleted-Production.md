---
title: "How I Replaced Slow SQL INSERTs with a 50‑Line Seeder Binary — and Nearly Deleted Production"
pubDate: 2026-09-09
description: "I built a tiny, idempotent seeder that populates realistic demo data in 2 seconds. What saved my client demo — and the safety checks that stopped it from becoming a disaster."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Hands typing on a laptop keyboard beside a notebook and a coffee cup"
  caption: "Photo by Annie Spratt on Unsplash"
  creditUrl: "https://unsplash.com/@anniespratt"
tags: ["developer-tools", "local-development", "postgres"]
---

The demo starts in five minutes. The staging database is a cold VM on a dodgy office Wi‑Fi in Koramangala. I’m watching a spinner that’s been at 40% for three minutes while a Python script inserts 5,000 rows one INSERT at a time. I can feel the room's patience leaking.

That was my routine for months: run a short script, walk to the coffee machine, come back and hope the demo data was ready. It worked most of the time. It didn’t work when the office router dropped packets, when our DB was under backups, or when the client wanted to see a specific user id live. I needed something fast and predictable. So I wrote a tiny seeder binary that runs in two seconds, and then learned the hard way that "fast" without safety is dangerous.

Why the old scripts failed

The Python/ORM route had three problems in practice:

- They issued thousands of individual INSERTs. On flaky networks or under lock contention this ballooned to minutes.
- They tried to be "clever" about test data (randoms, timestamps). That made reproducing a failing demo impossible.
- They had no safety. The same script that populated staging could, with an env var typo, run against production.

I needed three properties: speed, reproducibility, and safety. Turns out you can get all three with about 50 lines of code and a pragmatic approach.

The 50‑line idea (practical, not pretty)

I wrote a small Go binary (50–80 LOC). Why Go? Compiles to a single static binary, zero runtime dependencies, easily cross‑compiled for my laptop or a ₹300/month VPS when I need a stable seed server.

The approach:

- Produce deterministic CSV rows in memory instead of random heavy objects.
- Stream them directly into Postgres using COPY FROM STDIN (psql's COPY or pgx CopyFrom). One network round‑trip, bulk load semantics, transactional speed.
- Make the seeder idempotent by using UPSERT (ON CONFLICT DO NOTHING or a small temporary table + INSERT ... SELECT).
- Add an explicit safety check: the binary refuses to run against DBs whose URL hostname contains "prod" unless you pass --confirm-with-I‑know‑what‑I’m‑doing (yes, the long flag).

Example run I use in demos:

cat demo-users.csv | ./seed --db="$SEED_DB_URL" --table=users --confirm=staging

And the internal COPY command looks like:

COPY users (id, name, email, created_at) FROM STDIN WITH CSV;

That single COPY completes in under two seconds for 5k rows on my laptop and under 10s on the worst office broadband I use in Bengaluru.

Why CSV + COPY, not bulk INSERTs or ORM?

COPY is native to Postgres. It avoids statement parsing per row and handles network streaming efficiently. It also lets me generate the CSV on the fly and keep the seeder predictable. The simplicity wins: less to go wrong during a demo.

The day it almost deleted production

Confidence is a dangerous thing. Two months after I shipped the seeder, I was running a pre-demo checklist at 9:45 AM. I typed the environment var for the DB quickly, hit Enter, and watched the progress bar zip by. At 9:46 my pager went off. Someone on Slack wrote: "Why are we seeing mass demo users in prod?"

I had neglected to add a second safety: a required dry‑run step. The long confirm flag was too subtle when my brain was elsewhere. The seeder had interpreted my staging hostname (stg-db.mycompany) as "safe" because it matched a substring policy; a small typo in my env var pointed to prod-db.mycompany and the binary thought it was fine. It inserted demo rows into production. We caught it quickly: no data loss, but a mess in audit logs and a pissed-off ops lead.

What changed after that failure

I made three non-negotiable upgrades:

- Require a file-based confirmation token for non‑local DBs. If you want to seed non-local (any host not in 127.0.0.1/localhost), you must create a token file /tmp/seed-confirm and pass --token-file=/tmp/seed-confirm. Someone must physically create the file.
- Always run in a transaction and abort on constraint errors. If anything looks odd, the binary rolls back.
- Add a --dry-run that prints the first 10 CSV rows and the target table only. Now I run dry-run every time, even at 2 AM.

Those three small rules stopped me from touching prod again. They also bought me the psychological safety to run the seeder in front of clients.

Tradeoffs and an honest constraint

There are tradeoffs. The seeder is intentionally simple: CSV, COPY, deterministic columns. That means I don't get the "realistic randomized behaviour" an integration test suite might want. I accepted that. For regression work I still keep my heavy data generators and property-based fuzzers, but for demos I want fast and reproducible, not perfectly realistic.

Another limitation: COPY bypasses some ORMs triggers and simple app-side hooks. If your app depends on DB triggers or side‑effects, the seed might produce data that the app doesn't entirely recognise. For those cases I wrote a small post-seed hook that can call internal services to complete the demo setup. Ugly, but practical.

How I run it now (the real workflow)

- Build once: go build -o seed ./cmd/seed
- Generate CSV deterministically: ./seed --mode=generate --seed=202609
- Dry run: ./seed --db="$URL" --dry-run
- Confirm with token for remote DBs
- Execute: cat demo.csv | ./seed --db="$URL" --table=users --token-file=/tmp/seed-confirm

I've used this in client rooms across Bengaluru, Mumbai, and at a remote client's office in Goa. It saves me 3–5 minutes per demo on average, and more importantly it removes the panic of "did the script finish yet?"

Takeaway

If you spend demo-time waiting for data to be inserted, stop. A tiny seeder that streams deterministic CSV into COPY gives you reproducible demos and fixes most slow‑insert pain. But build safety into the tool from day one: dry‑run, explicit physical confirmation for non‑local targets, and transactional aborts. Fast is useful. Fast without safety is expensive.