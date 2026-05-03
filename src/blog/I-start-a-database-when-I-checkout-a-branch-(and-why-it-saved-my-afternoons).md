---
title: "I start a database when I checkout a branch (and why it saved my afternoons)"
pubDate: 2026-05-03
description: "I automated branch‑local databases with git hooks so each feature branch has its own Postgres. It cut context‑switch time — until disk blew up and CI complained."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with a laptop screen showing code"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["developer-tools", "local-development", "postgres"]
---

It was 8pm and I had three branches open that all wanted different schema tweaks. I switched from feature/auth to feature/payments, ran the migration, and my local database clobbered the tiny test dataset I'd painstakingly curated for auth. I wasted two hours rebuilding the data and mentally replaying the last hour of context-switching. This happened twice in one week.

I’d already tried the usual fixes: separate DB users, careful migration order, and a "don't run migrations" pact with my teammate (which lasted three days). The root problem was that my single Postgres instance was a single mutable thing shared across branches. When I switched mentally, I still had to manually rebuild a database, seed data, or remember which branches were safe to run tests on. That friction killed momentum.

So I automated the boring bit: when I checkout a git branch, a branch‑specific Postgres instance spins up (or reuses an existing one). When I leave the branch, it shuts down. No more accidental schema stomps, no more rebuilding test data every time I hop branches.

How it works (practical, not theoretical)

I kept it deliberately simple — no bells, no orchestration. The pieces are:

- One base Postgres Docker image with a preseeded dump (pg_base.dump).
- A git hook (post-checkout) that:
  - Determines branch name (safe filename-friendly slug).
  - Starts a container named pg-branch-{slug} with a volume pgdata-{slug} if not present.
  - Exposes Postgres on a branch-specific port (I pick an available port programmatically).
  - Writes a .env.local or .postgresrc in the repo with DATABASE_URL so my app picks it up.
- A cleanup hook (post-commit or manual script) that prunes volumes older than N days.

Concretely: when I checkout feature/payments, the hook runs, detects no pgdata-feature-payments, loads the base dump into a new volume, starts postgres:13 with that volume, and sets DATABASE_URL=postgres://dev:dev@localhost:5433/payments_dev in .postgresrc. My app uses ENV to pick DB. Switch to feature/auth, hook starts pg-branch-feature-auth on 5434, and .postgresrc is updated.

Why this reduced friction
- I stopped rebuilding seeds. Each branch gets a reproducible snapshot.
- I could leave in-console tweaks (test rows, flags) without fear of colliding with other work.
- Tests that require schema changes run reliably because they target the branch DB, not the global one.
- Context-switches became fast: checkout → wait ~5–10s for container → continue.

An actual India‑lean detail: I work from a 4‑year‑old ThinkPad with a 256GB SSD. The first week I ran this, disk usage jumped fast. I ended up buying a 128GB NVMe for ₹4,500 and moved all Docker volumes there. That was the practical tradeoff that made it usable day‑to‑day.

The thing I broke (and the lessons I learned)

This feels neat. It’s not magic. Three real failures/tradeoffs taught me how to make it sustainable.

1) Disk nightmare (my fault)
I naively created a volume for every branch. After a month I had ~30 pgdata volumes, many unused, and Docker ate 40GB. My app was crawling and backups were slow.

Fix: Add an expiry policy. A pruning script lists volumes by creation time, keeps the last 5 per repo and anything modified in the last 7 days, deletes the rest. I also switched the base dump to a compressed SQL and used sparse-copy where possible. The habit: run cleanup once a week or add a cron job. Discipline beats cleverness.

2) Port and config hell
At first I tried mapping all branches to the same port and switching the DB name. That broke a lot of tooling (GraphQL playground, local admin UIs) that assumed host:port identity. Later, I tried dynamically picking free ports. That was better, but some frameworks (React Native dev clients, browser extensions) hardcoded localhost:5432 during debugging.

Fix: Standardize an env file in repo root (.postgresrc) that every developer's tooling reads. Add a tiny adapter in the app that prefers DATABASE_URL but falls back to .postgresrc. If you can’t change a third‑party tool, run a small TCP proxy that maps a local fixed port to the branch port during active work.

3) CI mismatch (the painful week)
My local habit diverged from CI. On CI we always use the single canonical Postgres and run migrations there. One Friday I merged a branch that passed local tests (because its branch DB included a local patch to a migration), but failed in CI. I’d learned to rely on local tweaks and forgot CI’s invariant.

Fix: Make CI the source of truth. The rule: migrations and seeds must be runnable from repo scripts without local hacks. I added a pre-merge check that spins up a clean Postgres container (the same base dump) and runs tests in a disposable environment. That caught the problem earlier.

When this is a bad idea

If you’re on an already-full SSD, or your team prefers a single shared sandbox database for integration tests, this is a bad fit. Also, if your app’s infrastructure depends on things that can’t be containerized easily (special kernel modules, proprietary extensions), the isolation breaks down.

What I actually use today

- git worktrees + hook that maps worktree path → branch slug.
- Docker Compose templates that accept BRANCH_SLUG and BRANCH_PORT envs.
- A repository script clear-old-db that prunes old volumes older than 7 days.
- A CI job that enforces "migrations run clean on a fresh container."

Final takeaway (the short version)

If you spend time rebuilding test data or reapplying migrations every time you switch branches, automating a branch‑scoped database with git hooks removes a lot of cognitive friction. You trade disk and a bit of complexity for reliable, fast context switches. But you must add pruning, standardize how tools read DB config, and keep CI honest — or the convenience becomes a slow, expensive trap.