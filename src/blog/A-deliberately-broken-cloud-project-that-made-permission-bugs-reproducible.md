---
title: "A deliberately broken cloud project that made permission bugs reproducible"
pubDate: 2026-07-13
description: "I keep a deliberately mis‑configured cloud project to reproduce permission failures reliably. Here's what I include, the ₹1,200 mistake I learned from, and why it pays off."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a desk with a code editor open, a coffee cup, and a notepad"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["infra", "cloud", "on-call"]
---

It was 2:13 a.m. and the on-call channel was a blur of screenshots, partial stack traces, and one repeated line: "permission denied: storage.objects.get". The production logs showed a service account failing exactly when it tried to fetch a file from GCS. The problem was intermittent — worked for a while, then failed. No change in CI. No recent deploys. No reproducible test locally.

I didn't want another frantic, guessing game. So I walked over to my laptop, spun up a deliberately crippled cloud project, and reproduced the failure in fifteen minutes. That one act stopped three all‑nighters over the next year.

If you work with cloud IAM and have ever chased invisible permission issues, this is what I now keep: a tiny, intentionally broken cloud project that reproduces permission failures reliably. It cost me time and a ₹1,200 billing surprise once. But it repays that cost every time we avoid a bad page‑one outage.

Why a broken project
Most teams test the happy path. We deploy to staging, run smoke tests, and assume permissions are the same in prod. They aren't. Production accumulates hand‑tweaks, emergency changes, and subtle role expansions that never make it back to staging. That divergence is where permission bugs live.

A deliberately broken project forces the negative cases to show themselves. It lets me answer questions like: does our error handling surface the right message? Does the SDK back off on 403s? Does the service account fall back correctly to a read‑only path? More importantly, it helps my juniors, PMs, and on‑call engineers reproduce the exact user‑visible failure without touching production.

What I actually keep in the broken project
This is practical, not academic. I keep the smallest possible footprint so it’s cheap to run and easy to reset.

- A short‑lived project name: demo-broken-iam-<date>. Small, obvious, disposable.
- One service account that matches our production SA naming and key usage pattern.
- The same storage buckets, minimal size, with obfuscated test files. (I don't put real data here.)
- A mirror of the minimal infra: a tiny VM or Cloud Run service that runs the same code path we hit in production.
- IAM policies that are intentionally restrictive: remove storage.objects.get from the SA, or deny access from certain networks. I replicate the kinds of mistakes we've actually seen (missing roles, conditional bindings based on IP, accidental Deny rules).
- A basic smoke script: a one‑liner that calls the exact API with the test SA and prints the full error blob (HTTP code, API error, headers). This is what I paste to Slack when I want others to confirm the failure.

I don't try to match everything: no logging stack export, minimal monitoring, and no production secrets. That keeps scope tight and the project disposable.

How I use it day to day
- Reproduce first. If a runtime 403/401/policy error appears in prod, I try the smoke script here first. If it fails the same way, I have a starting point for remediation and a concrete error to paste in a PR.
- Teach with it. New hires run the same failing script and then apply fixes (add role, change conditional) to learn how IAM changes propagate.
- Test UX: we hide or surface different messages based on API errors. The broken project lets the frontend team see the exact error and adjust copy.
- Automate regressions: I add a quick CI job that runs the smoke script against the broken project on a weekly schedule to detect policy drift in our assumptions.

The ₹1,200 lesson (and the guardrails I added)
I should have known better but didn't: once I forgot to stop a small VM I spun up in that project. It ran for three days. The bill showed ₹1,200. I felt foolish. In India, ₹1,200 isn't life‑breaking, but it stung because the whole point was cheap, disposable testing.

That mistake forced me to harden the workflow:

- Use smallest instance types or use Cloud Run. Anything that auto‑dies is better.
- Set an automatic deletion tag: I add a label like ephemeral:true and a single cron job (on my main account) that tears down projects older than 48 hours.
- Budget alerts: a ₹500 cap alert via the cloud provider and an automated Slack message to me. If the alert fires, tear it down immediately.
- Keep no real data. If you accidentally leak or misconfigure, the surface area is tiny.

Real tradeoffs and an honest failure
This approach isn't perfect. You can't simulate enterprise‑wide Deny policies that only exist in production because of historical acl cruft across multiple orgs. Sometimes an error reproduced here still behaves differently in prod because of network egress rules, VPC Service Controls, or org‑level policy. I learned that the hard way when we fixed an IAM binding that passed in the broken project but still failed in prod due to a conditional deny applied at org level.

So I treat the broken project as a surgical tool: excellent for reproducing and iterating on single‑point permission issues, insufficient to replace careful production audits for org‑level policies.

A surprising win: better error messages
The biggest behavioural change wasn't technical. Reproducing exact errors made us stop guessing error handling semantics. We started surfacing the full API error to product owners during triage. That led to three product changes: clearer error copy, better retry behavior for specific 403s, and one defensive change where we now switch to a degraded mode instead of failing hard. Those three changes prevented two major incidents in the last nine months.

If you already have a staging project, add this as a sibling, not a replacement. Keep it tiny. Label it clearly. Automate its teardown. Expect it to miss org‑level policy issues. But if you're tired of "works in staging" as an excuse, you'll find the tiny upfront cost — and the occasional ₹1,200 lesson — far cheaper than a full‑team page at 2 a.m.

Takeaway: when a bug sounds like a permission problem, you don't want to argue about who changed a role in prod. You want to reproduce it fast, iterate on fixes, and ship better‑tested error handling. A deliberately broken cloud project gives you that, with a cheap and obvious routine for when it goes wrong.