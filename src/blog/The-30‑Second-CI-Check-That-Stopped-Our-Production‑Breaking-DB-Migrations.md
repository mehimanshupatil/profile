---
title: "The 30‑Second CI Check That Stopped Our Production‑Breaking DB Migrations"
pubDate: 2026-06-10
description: "How I added a tiny CI job that diffs schemas before merging migrations — what it detects, the one time it failed, and the tradeoffs we accepted."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop on a desk showing code in an editor, with a coffee cup and notebook nearby"
  caption: "Photo by Siora Photography on Unsplash"
  creditUrl: "https://unsplash.com/@sioraphotography"
tags: ["database", "CI", "postgres", "developer-tools"]
---

It was 2:07 AM when my phone lit up. Our payments service — the one that handles UPI and card settlements — started returning 500s. The logs pointed to a missing column. Someone had merged a migration earlier that week which dropped a column a background job still referenced. The job retried thousands of times during India’s lunch spike and filled our queues. I fixed the job, rolled back the migration, and vowed I’d stop waking up for this particular class of mistake.

I could have tightened code reviews, added more tests, or made migrations more verbose. Those helped. What actually stopped the outages was a tiny CI job I added that runs in about 30 seconds and fails merges that introduce structural, destructive schema changes compared to production. It’s boring and blunt. And it works.

Why structural diffs, not full safety
We make a distinction between semantic bugs (your code expects a field to contain JSON and now it’s a string — tests catch that sometimes) and structural, destructive changes (DROP TABLE/COLUMN, changed primary key, dropped constraint). The latter consistently causes outages because background jobs, analytics queries, and legacy services keep using old structures.

Catching structural drops before they hit production reduces the 2 AM pages. You don’t need a perfect tool; you just need a fast, reliable guard that says “this PR will remove or fundamentally change DB things that other code might still rely on.”

What the check does (in 30 seconds)
We used migra — a tiny Python tool that diffs two Postgres schemas and prints SQL to migrate one into the other. The CI flow is:

- Keep an up‑to‑date production schema dump (schema-only SQL). We update it after each successful deploy and nightly.
- In CI, spin a temp Postgres container.
- Restore the production schema dump into DB_A.
- Clone DB_A to DB_B (or restore the same dump again).
- Apply the candidate PR’s migrations to DB_B.
- Run migra DB_A DB_B. If migra reports DROP TABLE/COLUMN or other destructive changes, fail the job.

A pared-down sample (GitHub Actions) looks like this:

- Start postgres:13 container
- psql -f prod_schema.sql -U postgres -d db_a
- psql -f prod_schema.sql -U postgres -d db_b
- ./scripts/apply_migrations_to_db_b.sh  # runs the migration files from the PR
- pip install migra psycopg2-binary
- migra postgres://postgres@localhost/db_a postgres://postgres@localhost/db_b --unsafe > diff.sql || true
- grep -E "DROP TABLE|DROP COLUMN|ALTER TABLE .*DROP" diff.sql && exit 1 || exit 0

Why this is cheap and fast for us: our schema is ~50–150 tables; the dump is schema-only and <10 MB. Spinning the container + restore + migra comparison runs in 25–45 seconds on our CI runners. It adds a second safety layer without inflating full test runtimes or flaking builds.

The week it failed — and what we changed
We did have one embarrassing miss. A teammate merged a change that dropped a table which another feature branch had just added and merged an hour earlier. Our prod schema dump was stale — it had been updated nightly and not after the deploy that added the table. Because the dump lacked the new table, the diff didn’t flag the drop. Production broke during evening traffic. Extra pages. Sorry messages. Lessons learnt:

- Automate the dump. We now run a post‑deploy job to refresh prod_schema.sql and upload it as an artifact the CI can pull. No more relying on nightly cron.
- Keep the job mandatory for protected branches. It’s a blocking check on master and release branches but optional on feature branches, so it doesn't slow local iteration.
- Make the check informative. If it fails, the CI shows the migra output and links to the exact migration file. That cut the back-and-forth in reviews.

Limitations and tradeoffs I lived with
This is not a silver bullet.

- It only catches structural diffs. Renames that are implemented as DROP + ADD still get flagged; great. But semantic changes (changing defaults, altering function behaviour, or removing an index that suddenly kills a query) are invisible.
- It needs a reasonably current production schema. If your deploys are rare or your team has multiple parallel migrations, you must automate the snapshot to avoid stale misses (we paid for this the hard way).
- CI time and cost. Each run adds ~40–60s. For us, that was acceptable. If your CI minutes are precious (free GitHub Actions for an org, or paid runners at ₹3,500+/month), consider moving this to a dedicated "safety" workflow that runs only on PRs targeting main/release branches.
- Complex migration systems. If your migrations are executed by an external job that relies on runtime data (backfills, complex deploys), you’ll need to materialise that logic in CI or accept gaps.

Why it stuck
Three reasons:

1) It’s fast. You don’t need to run a staging restore with data to catch most destructive mistakes.
2) It’s low friction. Developers can run the same script locally with Docker if they want to validate before pushing.
3) It forces a small cultural change: authors of migrations write one line explaining intent, and reviewers look for structural changes first before debating defaults.

One honest tradeoff: we increased merge friction slightly. A couple of times we had to coordinate two PRs where one added a column and the other removed something dependent. The check forced sequencing — annoying, but preferable to fixing production at 2 AM.

What I walked away with
If you want to stop a very specific, recurring outage class — destructive structural DB changes — invest 30–60 minutes and add a CI job that diffs the schema against a current prod snapshot. It won’t find every bug. It will stop the dumb, noisy failures that wake you up in the middle of the night, and that alone was worth the 40‑second CI tax for our team.