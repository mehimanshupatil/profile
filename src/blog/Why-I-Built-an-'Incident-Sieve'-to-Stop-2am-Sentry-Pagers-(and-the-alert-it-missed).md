---
title: "Why I Built an 'Incident Sieve' to Stop 2am Sentry Pagers (and the alert it missed)"
pubDate: 2026-08-21
description: "How I stopped waking up at 2am for the same Sentry noise by adding a small webhook layer that groups, dedups, and enriches alerts — and the time it filtered out a real outage."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A person coding on a laptop at night with a coffee cup and dim desk lamp"
  caption: "Photo by Branko Stancevic on Unsplash"
  creditUrl: "https://unsplash.com/@brankostancevic"
tags: ["observability", "on-call", "devtools"]
---

It was 2:14 a.m. The phone vibrated, my screen lit up: "error.rate spike — users:payments — Sentry". I fumbled through half-asleep commits, muted the thread, and went back to bed. The same alert came again at 2:19 a.m. Then at 2:25. Same stack trace, different ID, same panic that wasn't one.

This repeated for a month. Wake up, acknowledge, sleep. Repeat. My team was small — three on-call devs for a product used by tens of thousands of Indians each day — and we were paying for PagerDuty seats we barely used constructively. I hated those pings and I hated that they were mostly noise.

So I built a small webhook proxy — what I now call the "incident sieve" — that sits between Sentry (or any error source) and our pager/SMS/Slack endpoints. It doesn't replace monitoring. It keeps the pager for real emergent situations, but it intercepts the recurring noise we were living with. I run it on a ₹300/month VPS, it uses Redis for state, and it saved me roughly three sleep interruptions a week. It also almost cost us a real outage. Honest tradeoff incoming.

What the alerts were doing wrong
The core issue wasn't Sentry. It was our alerting config and the downstream workflow.

- Every distinct event ID or sampling window created a new alert. Same underlying root cause; different fingerprint or tiny stackline change => new page.
- Alerts lacked context: which deploy was live, whether a rollback was already in progress, how many users were impacted.
- No simple suppression rules existed for "same error" across a short time window; ops could silence noise only by sleeping the pager.

In India, where on-call often means a late-night bike ride to a client's data centre (or worse, explaining to family why your phone buzzes at 2 a.m.), the psychological cost of false alarms is big. We needed to reduce interruptions without introducing blind spots.

What the sieve does (without magic)
I had three goals: group duplicates, add small context, and let humans override quickly.

Basic flow:
- Sentry → webhook → incident sieve → (PagerDuty/Slack/OTP)
- The sieve computes a fingerprint (preferred Sentry fingerprint, else a normalized stack signature).
- It keeps a Redis entry per fingerprint with a tiny timeline (first seen, last seen, count).
- If an alert for a fingerprint arrives within a suppression window (we started with 10 minutes) and the last outgoing notification was sent < suppression window, the sieve increments count and only updates state — it does not page again.
- Every outgoing notification includes enriched fields: current deploy version (from our easy /deploys/latest endpoint), recent error rate in the last 5 minutes, and a small "why this paged" line (threshold crossed / new stackframe / external dependency).
- The sieve exposes a quick /snooze/<fingerprint> and /force/<fingerprint> endpoints guarded by a short-lived token for on-call use.

Implementation choices that mattered
- Fingerprint: I prioritized Sentry's fingerprint when available. Otherwise I normalize the stacktrace to the top three frames, remove variable parts (IDs, hex), and hash that. This reduces false distincts without being brittle.
- State store: Redis. Cheap, fast, persistent enough for our needs. It cost ₹300-₹500/year on the VPS.
- Notification channels: PagerDuty for pages, Slack for non-pager summaries. Slack messages are detailed; pages are terse with a link to Slack for context.
- Deploy detection: a tiny internal API returns the current git SHA. The sieve checks it; if a new deploy went out in the last 10 minutes, it tags the alert as "post-deploy — actionable" so pages bypass suppression.
- Safety valves: every fingerprint has a TTL of 24 hours so we don't suppress forever. We also built an "escape hatch" — if a fingerprint's error rate multiplies beyond an absolute threshold (users/sec or HTTP error 500 rate), it forcibly pages even if previously suppressed.

Costs and runtime
The whole thing fits in a single 256MB VPS (I use a ₹300/month provider plan) and a tiny Redis instance. Monthly cost including domain+SSL + VPS: ≈ ₹800–1,200/month for our small team. PagerDuty still costs us; we didn't remove it. The sieve reduced our actionable pages by about 70%, so the PagerDuty noise felt tolerable.

The time it failed me (and what I changed)
Two months in, on a sleepy Sunday, a poorly formed third-party response started returning a new error variant. The sieve grouped it under a fingerprint that had been noisy for weeks; because of suppression and my overzealous 10-minute window, it never paged. The Slack channel had summaries, but nobody looked until a user messaged our support channel at 10 a.m. We missed three hours of degraded payments.

That mistake taught me two things:
- Suppression must be conservative by default. I had optimized for sleep; I needed to optimize for user impact. I rewired the logic so that any change in error phenotype (HTTP status jump, new top-frame) forces a page the first time it appears, even if the fingerprint looks the same.
- Humans must be able to opt out of suppression easily. We made the /force endpoint a one-click Slack action and gave engineers the habit of forcing pages when in doubt.

Limitations I live with
- The sieve can't replace a proper incident response playbook. It reduces noise, but it adds one more moving part I must trust. If the VPS or Redis dies, alerts flow straight through — good fallback — but enrichment is lost.
- It relies on small internal signals (our deploy API, our metrics endpoint). Those need careful monitoring themselves.
- It requires upkeep. Fingerprint tweaks, thresholds, and occasional rollbacks. It adds a configuration surface I don't love.

If you want to try this
- Start with one rule: group identical fingerprints for 10 minutes, and send only one page. Add Slack summarization for subsequent repeats.
- Add deploy context next. It’s the single most useful enrichment.
- Keep an escape hatch: forced pages, and a hard threshold that bypasses suppression.
- Run it on a cheap VPS. If it dies, let alerts fallback to original destination.

Takeaway
Noise is not just annoying — it trains teams to ignore pages. A small, transparent middleware that groups duplicates and enriches alerts saved me real sleep and made the pager meaningful again. Be conservative when suppressing: the one time I wasn't, we missed three hours of user pain. My current rule: dedupe aggressively, but never suppress a change in error phenotype. That single rule rebuilt our trust in the pager — and let me finish a night's sleep without the phone lighting up at 2 a.m.