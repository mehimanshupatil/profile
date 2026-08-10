---
title: "I keep a 50‑row demo database in the repo — and the day it almost leaked PII"
pubDate: 2026-08-10
description: "Why I started shipping a tiny, realistic demo DB with my app, how it saves me demo time in Bangalore client calls, and the privacy mistake that changed how I manage it."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop on a desk displaying code, with a notebook and a cup of coffee nearby"
  caption: "Photo by Daria Nepriakhina on Unsplash"
  creditUrl: "https://unsplash.com/@dnepriakhina"
tags: ["developer-tools", "local-dev", "privacy"]
---

We were running late into a Tuesday demo with a client in a cramped conference room in Bengaluru. The office Wi‑Fi had that familiar latency: sticky login portals, a DHCP hiccup, and a staging DB that decided to time out for the afternoon. I had one minute before the client asked to "see the payments flow end‑to‑end." My usual plan — use staging — was gone.

What saved the demo was a tiny file in the repo I almost never talk about: a 50‑row Postgres dump of "demo" data that I ship with the app. It boots in seconds, has realistic rows (transactions, UPI IDs, masked bank names), and reproduces the exact screens we needed to show. We finished the demo while the Wi‑Fi died twice more. The clients smiled; I felt smug. Then, later that week, I discovered why smugness is dangerous.

Why I started shipping a tiny demo DB
Our staging is slow and shared. Every demo used to mean waiting for a snapshot, dealing with flaky data, or performing awkward imports minutes before a call. I kept a local habit: a minimal, curated dataset that shows the happy path plus the common edge cases—failed payments, RBI‑related holds, refunds, and a couple of malformed UPI IDs. It fits in a single SQL file and lives under dev/data/demo.sql.

Why 50 rows? Because it’s enough to feel real and small enough to load in 2–3 seconds on most laptops. I can keep it in the repo, load it with a one‑liner, and iterate it as UI changes.

How I keep it useful without being a privacy dumpster
Making demo data "real" is tempting. Real-looking names, Indian bank names, sample PAN formats — they help UX teams and clients believe the product. But reality bites.

Here’s what I do now:

- Synthetic-but-realistic: I generate names, emails, and UPI handles via Faker, but I prefix critical identifiers with demo_ (demo_upi_123@icici). No chance of colliding with real users or routing to banks.
- Clear markers: Every demo row has a demo_user boolean and a visible "DEMO" suffix on display names. If the data ever reaches logs or analytics by mistake, it's obvious.
- No real tokens: Payment tokens, bank references, or external IDs are fake strings that adhere to expected formats but won’t be accepted by gateways.
- A scrubber in CI: Whenever someone commits a demo data file, a CI job runs a small Python script that checks for common production patterns and flags suspicious rows (e.g., 10‑digit Indian mobile numbers starting with 9/8/7, PAN regex, or emails from our real domains).
- Loader automation: A bin/load_demo.sh script drops and recreates the demo DB in a systemd user service (or in Docker). One command, no "oh wait let me set env vars."

The mistake that almost became a leak
Two months after that Bengaluru demo, I merged a schema migration that added a new column for bank_reference. A colleague wanting to test it locally ran a small query against staging to copy a sample and accidentally included a real bank_reference in the CSV dump they pasted into dev/data/demo.csv. The scrubber didn't catch it because the bank_reference format wasn't part of the checks.

I noticed it during a code review. The value looked real. It only took a minute to trace: someone had copied a single production column into the demo dataset and committed it. We had no data exfiltration to users, but if that repo had become public, we'd have had a real problem. That one miss made me add three changes overnight:

1) enforce a denylist in CI for patterns like actual bank IFSC codes and numeric sequences that match our prod IDs,
2) require every demo file to include a generated metadata header: author, source (auto/generator/manual), scrubbed:true, and
3) stop allowing manual CSV pastes into demo/data; force a make regenerate-demo command that rebuilds the dataset from generators and schema fixtures.

Tradeoffs I accepted
Keeping a demo DB in the repo is not free.

- Maintenance: Every schema change needs demo updates. That’s a small friction I accept because the productivity wins are bigger for demos and onboarding.
- Divergence: Tiny data won't catch scale issues. A query that runs in 5ms on 50 rows might be 2s on 5 lakh rows. I still rely on staging for performance testing.
- Merge conflicts: Binary dumps are a mess. I keep the dataset as a set of small, human‑readable SQL INSERTs and generation scripts to make diffs manageable.
- Policy: At one company, security forbade any repo‑bundled datasets. I had to convince infra to let the demo live in a private package with CI gates. That negotiation cost me two days of bureaucracy.

How it changes my day
For client demos and for onboarding new hires, the demo DB saved me 10–20 minutes per demo and removed a recurring source of pre‑call anxiety. New hires can spin the app up locally, run make demo, and see meaningful screens without waiting for network access. For sales, it’s made demos less fragile in offices with erratic Wi‑Fi or where the customer's network blocks certain endpoints.

A single rule I now live by
Never let data look too real. If an identifier could be mistaken for a real bank account, PAN, or mobile number, it’s toxic. Prefix it, mark it, and block it in CI.

I still fail sometimes. Once a migration slipped past and the demo UI broke because the dataset lacked a migration edge case. But that failure was cheap — 10 minutes, a fix, and a test added to the generator.

Takeaway
If you demo software in India — with flaky office networks, shared staging, and impatient clients — a tiny, well‑guarded demo DB in your repo buys you reliability and speed. But treat it like a controlled stub: automated scrubbers, obvious demo markers, and CI checks. The convenience isn't worth the risk if you let real PII slip back in. My current, selfish question: how small can the dataset get before it stops being convincing? I'm testing 25 rows next.