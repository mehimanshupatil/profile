---
title: "The 15‑Minute Incident Triage Playbook for Solo On‑Call Devs in India"
pubDate: 2026-03-18
description: "A compact, practical incident triage playbook for solo on‑call engineers in India—what to do in the first 15 minutes, with real tradeoffs and templates you can use today."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&h=1000&q=80"
  alt: "A small engineering team gathered around a laptop, discussing an incident"
  caption: "Image credit: Unsplash / Brooke Cagle"
  creditUrl: "https://unsplash.com/photos/3a6694fb2f61"
tags: ["incident triage", "on-call", "devops"]
---

If you’ve ever taken a 3 a.m. page and stared at a terminal while the coffee goes cold, this one’s for you. For small teams and solo on‑call engineers in India, incidents don't wait for perfect conditions. You need a fast, repeatable way to decide whether to escalate, fix, or shelve the problem—and do it before your phone battery dies or network connection drops.

Here’s a tight, realistic incident triage playbook I actually use. It’s designed to be executed in 15 minutes and gets you to a safe state quickly. It assumes limited tooling (PagerDuty or simple SMS, Slack/WhatsApp, basic observability), variable mobile data, and the usual constraints of small teams.

Main goal: reduce blast radius and customer impact fast. Secondary goal: buy time for proper investigation.

The 15‑minute rhythm

Minute 0–2: Read the page, set context
- What triggered the alert? Look at the alert title, severity, and the primary metric. Don’t dive into dashboards yet.
- Who’s impacted? Internal service, users, a single region, or all traffic? If the alert text doesn't say it, assume worst and treat as user‑impacting.
- Record a single sentence in your incident log: time, alert, initial scope. This becomes the anchor for later notes.

Minute 2–5: Quick verification
- Can you reproduce the symptom from your phone or a curl? Sometimes the alert is noisy or transient.
- Check error rates and latency in the most obvious dashboard panels. If dashboards are slow on mobile, use CLI tools (kubectl, aws cli) to check pod counts, restart rates, or queue depths.
- If external dependencies (payments, third‑party APIs) are implicated, check their status pages — many Indian payments gateways expose simple status JSONs.

Minute 5–8: Contain
- If traffic surge or queue accumulation is visible, throttle or disable non‑essential jobs (cron tasks, batch workers).
- If a deployment looks suspicious (rollout started recently), consider a rollback or pause. For small teams, a quick revert is often the fastest mitigation.
- Communicate: post a one‑line status in the team channel and the customer-facing channel if you have one. Example: "Investigating payment failures since 02:15 IST. Users affected. Will update in 15 mins."

Minute 8–12: Short checklist for the underlying cause
- Recent deploy? Check CI/CD history and who merged; tag the author in Slack for context.
- Resource exhaustion? Check CPU, memory, and disk on affected nodes. In India, noisy neighbors on shared VPS instances can cause sudden resource issues—don’t rule it out.
- External rate limits? Many Indian third-party services have undocumented throttling; backoff or switch to cached responses if possible.

Minute 12–15: Decide and document
- Is a rollback or toggle enough? If yes, perform it and mark the incident as "mitigated" in your log.
- If you need more time (root cause unknown, security implications, or customer SLA pressure), escalate: call the secondary on‑call, open an incident bridge (even a shared Google Meet works), and set an expected update cadence (e.g., every 30 minutes).
- Add a short “next steps” list: who will investigate deeper, what logs to collect, and when the post‑mortem will happen.

Why this works (and what you give up)
This playbook forces early decisions: contain or escalate, not deep diagnosis. The tradeoff is intentional. You may miss a nuanced root cause in the first 15 minutes, but you'll stop user impact quickly and keep the blast radius small. For small teams, that’s usually the right trade.

Common real‑world constraints and how to handle them
- Spotty mobile data: prefer command-line checks and small JSON endpoints over heavy dashboards. Keep a tiny SSH key on your phone (Termux or Termius) for emergencies.
- Cost-sensitive teams: paid alerting tools are great, but a well‑configured SMS/email + minimal monitoring can work. Tune thresholds to avoid alert fatigue.
- Stale runbooks: a playbook only helps if it’s accurate. Schedule a quarterly “fire drill” where the on‑call person validates runbook steps and documents changes. Yes, it’s annoying—but the first time a runbook saves you from a 2‑hour outage, you’ll see why.

A tiny incident log template you can copy (one line per update)
- [HH:MM IST] State: {investigating|mitigated|escalated} — Trigger: {alert name} — Scope: {users/region/service} — Action: {rollback/throttle/escalate} — Next update: {HH:MM}

Why teams ignore this and why that’s a mistake
Teams often skip early containment hoping to "fix it properly" in the first go. That mindset costs customers hours. The hardest cultural change is accepting that a temporary, visible mitigation (a rollback, a toggle) is a legitimate, responsible outcome. It’s not a failure—it's risk management.

When not to follow the 15‑minute playbook
- Security incidents where evidence preservation is critical. Here, containment must be handled with forensics in mind.
- Regulatory incidents (PCI, personal data leaks) that require legal involvement before any system changes.

Wrap up like a human
If you’re a solo on‑call in a small Indian startup, the first 15 minutes matter more than the next 15 hours. This incident triage playbook is intentionally short and imperfect—good enough to stop the bleeding and give you time to think. Try it for a month, tweak the steps to your stack, and keep one honest tradeoff in your pocket: speed now, root cause later.

If you want, I can share a compact Slack status template and a one‑page runbook you can paste into your repo README. It’ll save you one late‑night panic, at least.