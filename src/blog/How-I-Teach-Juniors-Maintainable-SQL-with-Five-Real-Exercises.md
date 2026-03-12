---
title: "How I Teach Juniors Maintainable SQL with Five Real Exercises"
pubDate: 2026-03-12
description: "A practical, exercise‑based playbook to teach juniors how to write maintainable SQL that survives production quirks and small‑team realities in India."
author: "Rohan Deshpande"
image:
  url: "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&h=1000&w=2000"
  alt: "A developer at a laptop reviewing SQL queries on a screen, with notes and coffee nearby."
  caption: "Image credit: Photo by Scott Graham on Pexels"
  creditUrl: "https://www.pexels.com/photo/person-using-laptop-computer-1181675/"
tags: ["maintainable SQL", "developer productivity", "team workflows"]
---

If you’ve ever scrolled through a legacy repo and found a query that reads like a tax form, you know why maintainable SQL matters. In small Indian startups I’ve worked with, juniors are often thrust into schema fires: urgent bug, customer complaining, and a senior tucked away in another timezone. Code review catches bugs, but it rarely teaches the craft. Teaching maintainable SQL needs hands‑on practice, clear feedback, and realistic constraints.

Here’s a concise, repeatable exercise set I use in hiring and onboarding. Each exercise can be run in 30–60 minutes with a pair: one junior, one reviewer. The goal is not perfect SQL but predictable, readable, and performant queries that a teammate can own.

Why this approach
- Position: SQL is a programming language and a communication medium—write it for future readers, not just the optimizer. I prefer explicit, readable queries over clever one‑liners.
- Practical constraint: Indian startups often run MySQL/Postgres on modest VPS/RDS instances and have messy legacy schemas. Teach patterns that survive poor indexing and variable backups.
- Tradeoff: Readable queries are sometimes slightly slower than micro‑tuned ones. Invest in clarity first; optimize hotspots with measurement.

Exercise 1 — Read, explain, and sketch
Give the junior an unfamiliar query (real but safe, from a sanitized dump). Ask them to:
- Explain what the query returns in plain language.
- Draw the tables, primary keys, and relationships on paper or a whiteboard.
Timebox: 10–15 minutes.
What it teaches: Understanding intent beats pattern matching. Many juniors copy JOINs without understanding cardinality; this habit is the source of many production surprises.

Exercise 2 — Refactor for readability
Provide the same query and ask them to refactor it for clarity:
- Use explicit JOINs with ON clauses.
- Alias tables with meaningful short names (orders -> o, customers -> c).
- Break long WHERE clauses into logical blocks and comment non‑obvious filters.
Timebox: 15–20 minutes.
What it teaches: Maintainable SQL is code that future you can read. I insist on consistent aliasing and comments for business rules (e.g., "exclude test accounts created by our onboarding script").

Exercise 3 — Replace a correlated subquery with a join (and measure)
Give a correlated subquery version that’s correct but slow. Ask them to:
- Rewrite it using JOINs or aggregates.
- Run both versions on a small sample and estimate which will scale better.
Timebox: 10–20 minutes.
What it teaches: The team learns common performance antipatterns and how to reason about set vs row operations. The tradeoff to call out: JOINs can produce larger intermediate results; sometimes a subquery with a covering index is faster—teach measurement.

Exercise 4 — Indexing with intent
Hand them the schema and an EXPLAIN (or set a default slow plan). Ask:
- Which columns would you index and why?
- What’s the expected impact on write throughput and disk space?
Timebox: 10 minutes.
What it teaches: Indexes are not magic. In many Indian startups, storage and IOPS are constrained—overindexing kills writes. I push juniors to justify each index with a query pattern and estimate of selectivity.

Exercise 5 — Tests and edge cases
Provide a tiny dataset with edge cases: NULLs, duplicate keys, soft‑deleted rows, timezone differences. Ask them to:
- Write queries and one or two assertions (SELECTs that must return zero rows).
- Document assumptions (e.g., "we assume invoice_date is in UTC").
Timebox: 15 minutes.
What it teaches: Real datasets are messy. Tests codify business assumptions and prevent regressions—critical when you have a single senior who’s often in meetings.

A simple rubric to give feedback
When reviewing, score each run on:
- Correctness (does it return expected results?)
- Readability (naming, comments, structure)
- Scalability (obvious antipatterns avoided)
- Defensive thinking (handles NULLs, duplicates, missing FK)
I keep feedback specific: "Rename t to txn_id? Not helpful—use tr for transactions." Small, consistent critiques compound faster than long lectures.

Tools and setup (India‑friendly)
- Use a Dockerized Postgres/MySQL sample. Small VPS or a developer machine is enough.
- If bandwidth matters, share a 5–10MB sanitized dump over Google Drive or a local share; avoid huge production dumps.
- Use psql/mysql CLI so juniors learn explain/formatting basics. Many Indian teams still depend on the CLI during emergencies.

Real constraint and tradeoff
This approach consumes mentor time. Pairing juniors for five exercises takes 2–3 hours initially. You won’t fix legacy SQL in one sitting. But the payoff is faster onboarding, fewer emergency rollbacks, and a shared vocabulary for future refactors. Also, sometimes a readable query is 20–30% slower than the most optimized version; in low‑throughput endpoints that tradeoff is acceptable. Reserve micro‑optimization for measured hotspots.

Conclusion
Maintainable SQL is teachable, but not through random code reviews alone. Short, focused exercises force juniors to verbalize intent, consider scale, and write queries people can read at 2 a.m. Start with these five exercises, keep the feedback tight, and accept that clarity will often win over cleverness. Your future on‑call self will thank you.