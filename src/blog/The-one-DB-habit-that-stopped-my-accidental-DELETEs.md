---
title: "The one DB habit that stopped my accidental DELETEs"
pubDate: 2026-07-14
description: "I stopped opening databases as a full‑privilege user by default. A tiny rule — default to a read‑only DB user and a simple alias — prevented catastrophic staging wipes and cost me one migration test."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a desk beside a notebook and a cup of coffee"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["database", "developer-workflow", "safety"]
---

It was 11:30 pm. I had ten minutes before a client demo and one hand on my phone to unblock a staging bug. I opened psql, ran what I thought was a harmless cleanup query, and watched a whole table disappear. The table didn’t belong to a long‑forgotten test schema — it was the staging data we used to reproduce payment flows for clients. I stared at the prompt like you do when your laptop becomes evidence.

That week I learned two painful things. First: my reflex is to open the database as the account that can do everything. Second: reflexes bite you when you’re tired and the office internet is flaky (yes, Bengaluru suburbs, I’m looking at you). After a sleepless few hours restoring backups and awkward status updates to the client, I added one small, non‑glamorous rule: by default, never connect to a dev or staging DB as a write‑capable user.

This is what I actually implemented, why it works, and the one real tradeoff I accepted.

What I changed — the tiny rule
- Default to a dedicated read‑only DB user for interactive work.
- Create a memorable alias (psqlro) that connects with that user.
- Make destructive work explicit: a second alias (psql-admin) that requires an environment flag or a short-lived token.

The mental trick: make "write work" slightly inconvenient so you have to think before doing it.

How I implemented it (practical, not theoretical)
We use Postgres on a small RDS instance (dev/staging bill: ~₹4,000/month). Creating a read‑only role took 10 minutes and saved far more time than it cost.

On the DB:

1) Create a read‑only role and grant only SELECT (and usage where needed):

   CREATE ROLE dev_readonly LOGIN PASSWORD 'verylongrandom';
   GRANT CONNECT ON DATABASE myapp TO dev_readonly;
   GRANT USAGE ON SCHEMA public TO dev_readonly;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO dev_readonly;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO dev_readonly;

2) Keep credentials in ~/.pgpass (chmod 600) so tooling can use them without interactive typing.

On my dev machine (bash/zsh):

- Alias for day-to-day:

   alias psqlro="psql 'postgresql://dev_readonly@staging.mycompany.in:5432/myapp'"

- Explicit admin alias that requires a token file:

   alias psql-admin='[ -f ~/.db_write_token ] && psql "postgresql://admin@staging.../myapp" || echo "Create ~/.db_write_token to enable write access"'

To get write access you create the token (or fetch a short-lived credential) and then the alias works. Deleting the token revokes the convenience.

Why this stops most mistakes
- SELECTs work exactly the same. You can explore schemas, run joins, test queries. That’s the 90% of “I’ll quickly check something.”
- Mistakes that matter (UPDATE, DELETE, DROP, TRUNCATE) are blocked by role privileges. You don’t need to rely on memory or discipline — Postgres enforces it.
- It’s low friction. A single psql command alias is less overhead than the time you lose restoring a table.

One honest failure and the tradeoff
This system broke me once in a painful, real way.

We had a migration that altered a materialized view and needed to be tested on staging. I started the test in a rush and couldn’t perform the DDL because the read‑only user couldn’t. I flipped the token, ran the migration, and everything seemed fine. Later I realized I had forgotten to test the migration rollback path. Because write access is intentionally gated, I’d become complacent about the overhead — I pushed the rollback test to “tomorrow” and missed an edge case when we ran the migration in production. The rollback required an emergency fix and a hotfix release. My rule prevented accidental deletes but accidentally made me lazy about planning destructive work.

So I changed one thing: any migration or DDL task requires a tiny checklist in the repo README and a one‑line "I will run X" note in the team's async status channel before I enable write access. The rule works only when paired with the operational habit of explicit planning.

Constraints you should know
- Managed DBs sometimes restrict role creation. If your staging DB is a single shared user with the client, you can’t make a dev_readonly account. For a couple of clients we had to ask infra/DBA for help. That’s irritating but a one‑time ask.
- CI and automated jobs still need admin credentials. Keep those separate and tightly scoped; put them in your CI secrets, not your personal machine.
- This doesn’t replace backups or point‑in‑time recovery. It just reduces the chance of human error causing the restore to be necessary in the first place.

Why this is especially useful in India (practical context)
We demo to clients in shared meeting rooms with patchy Wi‑Fi, or from home where mobile hotspots throttle after 30GB. Those conditions amplify mistakes — slow listings, flakier state. A small permission boundary buys calm in those moments. Also: if you’re freelancing and juggling multiple client DBs, a tiny alias pattern prevents you from accidentally burning a client’s staging data when you have six terminals open.

What I actually walked away with
Making destructive power slightly inconvenient removes a surprising number of stupid mistakes. The read‑only default is not a security panacea — it’s a safety net for sleepy humans. Pair it with a simple pre‑write checklist and a token‑based way to enable writes, and you get a practical habit: you only enable destructive power when you intend to use it.

I still keep a checklist on my laptop before enabling write access. That checklist stopped one more late‑night accident last month. You won’t stop being careless forever. You can, however, make the DB less tempting to wreck when you are.