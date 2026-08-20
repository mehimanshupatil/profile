---
title: "The two‑line 'reset‑demo‑user' script that saved a client call — and the day it almost wiped production"
pubDate: 2026-08-20
description: "How a tiny repo script that reseeds a demo user fixed my last‑minute staging chaos — and the hard lesson I learned when it nearly ran against production."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden desk with a notebook and coffee"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["developer-tools", "on-call", "staging"]
---

I was on a 11:00 AM Zoom with the CTO of a Bengaluru payments startup. Demo queued. Staging looked healthy…until I switched users and everything I expected to show (a clean merchant dashboard, two successful transactions, a demo payout) turned into a user's messy history and an unpaid invoice.

Silence on the other end. My heart did the sprint it does before a production restore. I could have spent ten panicked minutes manually deleting rows, patching balances, resetting the UI, and still not be confident it matched what I wanted to show. Instead I hit a script: ./scripts/reset-demo-user.sh demo@company.com.

Thirty seconds later the dashboard showed exactly what I needed. The CTO smiled. We closed the call. Contract value: roughly ₹50,000 in immediate revenue and a pilot that led to more work.

That script is two real lines (plus a comment and a guard). It lives in every repo I touch now. Here’s what it is, why it matters, and why I nearly deleted production with it.

## Why a tiny script beats manual demo prep

Before the script I did three things that always failed me:

- Manually edit rows via PGAdmin or Rails console. Slow and error‑prone.
- Maintain a heavy "demo DB" snapshot that grows stale when schema changes.
- Rely on a teammate to reset things an hour before a call (and then hope they remember).

What I needed was repeatability, speed, and a safety net. The script gives all three. The idea is embarrassingly simple: keep a small JSON + SQL seed for “demo users” checked into the repo and a two‑line wrapper that loads it into the current environment, wrapped in a transaction and guarded by environment checks.

The core is:

- A tiny SQL file that truncates ephemeral tables for the demo user and inserts deterministic rows (no passwords in plaintext — we hash via an application command).
- A shell wrapper that chooses the right DB URL and runs psql with ON_ERROR_STOP and a transactional wrapper so a mistake rolls back.

Because it's in the repo, it evolves with schema changes. Because it's repeatable, I can run it in 30–60s even on my 15 Mbps work-from-home link. Because it's a script and not a manual checklist, it avoids the "did I forget to zero the balance?" panic.

## What the script looks like (practical bits)

I keep the script short, explicit, and paranoid. Example (conceptual):

#!/usr/bin/env bash
set -euo pipefail

# safety: only allow when DB host contains "staging"
[[ "${DATABASE_URL:-}" =~ staging ]] || { echo "Refusing to run: not a staging DB"; exit 1; }

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
-- seed: delete ephemeral rows, insert deterministic demo user, recreate token, set balances
DELETE FROM transactions WHERE user_id = (SELECT id FROM users WHERE email = 'demo@company.com');
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = 'demo@company.com');
-- ...insert statements from checked‑in seed.sql...
COMMIT;
SQL

Some practical lessons I learned while building this:

- Always require DATABASE_URL to match a regex (staging, demo, localhost). Simple string matching saved me later.
- Run everything inside BEGIN/COMMIT and fail fast with ON_ERROR_STOP. If anything misbehaves, rollback to avoid partial states.
- Make the seed SQL as small as possible. No full DB dumps. Just the rows needed for the demo to be convincing.
- Keep credentials out of the repo; the script expects an environment variable or an .env for local use.
- Add a --dry-run that prints the DB host and the top-level SQL that would run.

These make the script fast and predictable. It also reduces mobile data usage for remote demos: tiny SQL push instead of a 200 MB snapshot.

## The failure that changed everything

A few months after the Bengaluru demo I almost deleted production.

I ran the script from my laptop in a hurry. My .env file had DATABASE_URL set to a production read replica by mistake (I switch networks a lot; it’s an annoying, repeated thing). The staging regex check was present but I had refactored the script and accidentally changed the match to allow "prod" for internal testing. Result: the script started running against the wrong host. I caught it because psql printed a host name I didn’t expect — at step 3.

I did not commit any rows, thankfully. I’d wrapped everything in a transaction and the script error left the DB untouched. But we still paid the price: a restore verification, an incident postmortem, about ₹4,500 in cloud egress and consultant time, and 90 minutes of embarrassment answering "How did this happen?" to my manager.

The fix was brutal and obvious:

- Make the safety check explicit and strict: refuse to run unless DATABASE_URL contains "staging." No regex leniency.
- Require a literal --yes flag for non-dry runs, and require the script to be run from specific branches (CI often enforces this).
- Add a preflight that prints the DB host and asks for a typed confirmation (type STAGING).
- Run the script in CI nightly against a fresh staging to detect schema drift (the weekly run caught multiple migration mismatches).

That failure also changed where the script lives. I stopped placing it in a team member's home directory or a shared drive and put it in the repo with a small audit trail: a quick CI job that runs the seed in dry-run and commits a hash of the seed.sql each time it changes.

## The tradeoffs I accepted

- The script cannot emulate third‑party state. Payment provider webhooks, bank settlements, Razorpay payouts — those I still present as screenshots or use a sandbox flow. Reproducing external flows reliably is a separate, expensive project.
- Keeping seeds in the repo means occasionally cleaning them when they grow. I accepted that maintenance for the value of repeatability.
- I can't make everyone trust the script overnight. Some teammates still want manual resets. I leaned into documentation and the "30‑second win" — people converted fast after watching it work in a real call.

Takeaway

A tiny, well‑guarded script that reseeds a demo user saves more than time. It preserves credibility.

I no longer ship demos on seat‑of‑pants data edits. My one genuine takeaway: if a script can change data, code its paranoia first. The minute you allow convenience to beat safety, you’re one env var away from a real outage.