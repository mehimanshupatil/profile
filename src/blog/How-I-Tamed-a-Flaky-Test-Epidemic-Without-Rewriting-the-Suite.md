---
title: "How I Tamed a Flaky Test Epidemic Without Rewriting the Suite"
pubDate: 2026-02-22
description: "A practical, low-cost playbook for identifying, triaging, and reducing flaky tests so CI stops eating time and engineers stop ignoring the pipeline."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=2000&h=1000&fit=crop"
  alt: "Laptop screen showing a code editor and terminal with test failures"
  caption: "Image credit: Unsplash / Glenn Carstens-Peters"
  creditUrl: "https://unsplash.com/photos/hGV2TfOh0ns"
tags: ["flaky tests", "testing", "developer workflows"]
---

We hit the breaking point the week our main branch stopped being trustworthy. Developers were ignoring red builds. Pull requests sat unmerged because CI green was a lottery. The job board scrolled by with “fix flaky tests” tickets, but nobody had time for a full test rewrite.

If you’ve been there, you know the cost: wasted CI minutes, interrupted flow, and a slow-burn culture of “just rerun.” I’ll walk through the practical system I introduced at a small Indian product team that cut our CI noise by half in three months. It’s not magic—just focused tooling, policy, and a few uncomfortable tradeoffs.

Why flaky tests are a problem (beyond annoyance)
- They erode trust. When a test fails one day and passes the next, engineers start to treat CI green as optional.
- They slow shipping. Reruns block merges and shrink developer focus.
- They hide real bugs. Intermittent failures can mask regressions when teams quarantine instead of fixing.

Our main keyword for this problem is simple: flaky tests. Treat it as a measurable engineering debt.

Step 1 — Measure before you act
We started with two metrics:
- Flake rate = (number of reruns needed to pass) / (total failing builds)
- Flaky test frequency = how often a specific test flips between pass/fail across 30 days

How to measure cheaply: instrument your CI (GitHub Actions, GitLab CI, Circle) to attach a small JSON artifact on failure that logs run-id, test name, environment, node label, and stack trace. A Lambda or tiny Node script aggregated these into a CSV and we plotted flake rates in a simple Grafana panel. You don’t need an enterprise test flakiness product—just logs and a dashboard.

Step 2 — Fast triage: quarantine, don’t bury
We introduced a “quarantine” label for tests that meet a flakiness threshold (≥ 30% failure rate over 7 days). Quarantining means:
- The test is removed from the default CI smoke suite that gates merges.
- It still runs nightly in a separate “quarantine” job that collects rich artifacts (screenshots, logs).
- The PR shows a warning badge: “Contains quarantined tests.”

This reduced merge-blocking reruns immediately. Important caveat: quarantine is temporary. Treat it like a loan, not a dump.

Step 3 — Make flakiness actionable at the moment of failure
When a quarantined or flaky test fails on PR, the CI job:
- Collects a deterministic snapshot (seed, env, container image).
- Re-runs the test up to 2 more times, capturing artifacts each run.
- Annotates the PR with the outcome and the run artifacts.

This gives engineers quick evidence: a transient network glitch, an assertion that depends on time, or genuine regression. We found over 40% of flaky failures showed a clear environmental pattern (slow DNS, DB timeouts on certain runners), which were fixable without changing test logic.

Step 4 — Ownership + SLAs
Assign an owner to any test that gets quarantined. The owner has two simple obligations:
- Triage within 7 working days and propose either a fix plan or a documented reason to keep it quarantined.
- Reduce the quarantine time by applying a fix within 30 days or elevate the ticket.

At first this felt bureaucratic, but it worked: someone's name on a ticket increases the odds the test gets fixed instead of sleeping in limbo.

Step 5 — Fixes that actually stick
Common root causes and pragmatic fixes we used:
- External dependencies: replace live calls with reliable, lightweight test doubles. For external APIs we used controlled contract mocks in CI.
- Timing and concurrency: replace sleeps with polling helpers that assert with timeouts.
- Shared state: run tests with isolated databases/temporary prefixes or use containerized ephemeral services.
- Environment sensitivity: pin timezone/locale in test containers.

We avoided “big rewrites” as the first step. Small refactors and better isolation fixed the majority of high-value flakes.

Tradeoffs and the costs we accepted
- CI minutes went up temporarily. Rerun attempts and nightly quarantine jobs consume credits. We limited quarantine runs to off-peak hours and reduced parallelism to offset cost.
- Quarantining can hide real regressions. That’s why ownership and strict SLAs are crucial. We also required that any failing quarantined test that reproduces locally is escalated as a blocker.
- Some flakes were expensive to fix. Tests that relied on flaky third-party behaviour needed product decisions: accept a less exhaustive test for CI and cover the edge case with a periodic integration test.

India-specific notes that helped
- With constrained CI credits, schedule heavy quarantine and artifact collection during non-working hours (midnight–6 AM). Our CI provider had lower contention and we reclaimed minutes.
- Use low-cost self-hosted runners on small VPS (₹300–₹600/month) for deterministic environments. Offloading artifact-heavy jobs to these runners saved hosted CI minutes.

How much did we improve?
In three months we:
- Reduced the merge-blocking rerun rate from ~28% to ~12%.
- Lowered mean time-to-merge from 4 hours to 1.7 hours on average.
- Cut “I’ll rerun” culture: the team reinstated the rule—no blind reruns without an issue comment.

If you only do one thing, measure flaky tests. Data focuses attention and removes finger-pointing.

Parting candid advice
Flaky tests are symptoms of brittle integration and fragile environments. You won’t eliminate them all—some things (browser rendering, 3rd-party networks) will always be intermittent. But you can make them visible, owned, and expensive to ignore. The system we used is intentionally lightweight: visibility, temporary quarantine, ownership, and small targeted fixes. It kept shipping predictable without a test-suite rewrite—and that’s often all a small product team needs.

Now, pull up your CI dashboard. Find the top five flipping tests. Triage one today, assign an owner, and you’ll feel the relief in one sprint.