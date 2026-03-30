---
title: "Why We Gave Our Team an Error Budget — and How It Stopped Burnout Without Killing Velocity"
pubDate: 2026-03-30
description: "A practical playbook for small Indian engineering teams to use an error budget to balance reliability and feature velocity—what worked, what didn't."
author: "Rohan Deshpande"
image:
  url: "https://cdn.pixabay.com/photo/2016/11/29/09/32/brainstorm-1869269_2000x1000.jpg"
  alt: "A small engineering team standing around a whiteboard, sketching diagrams and discussing."
  caption: "Image credit: Pixabay / StockSnap"
  creditUrl: "https://pixabay.com/"
tags: ["error budget", "team process", "devops"]
---

We'd been doing the usual startup thing: ship fast, fix faster. Except at 2 a.m. on a Tuesday, when the payment gateway hiccuped during a flash sale, three of us were awake, scrambling, and apologising to an angry client while the rest of the company watched Slack explode. We told ourselves this was “part of growth.” After the third such night in three months, we tried something different: we gave the team an error budget.

This isn't a fancy academic experiment. It's a simple guardrail that helped us stop glorifying on-call suffering as a metric of commitment, and instead made trade-offs explicit: how much downtime are we willing to accept in exchange for faster releases? In small Indian teams—where people juggle on-call with client work, tight budgets, and festival-season traffic spikes—this clarity actually matters.

What an error budget is (in plain terms)
- Pick an SLO (service level objective) like “99.9% successful API responses over 30 days.”
- The error budget is the allowed downtime as a result of that SLO. For 99.9% uptime, that’s about 0.1% of a 30-day month — roughly 43.2 minutes of downtime.
- Treat that 43.2 minutes as a finite resource: you can burn it on risky launches, experimental features, or infrastructure changes. When it’s gone, you cut back on risky work until it’s replenished.

Why this helped us
- It made reliability a team decision, not a moral failing. People stopped privately promising “I’ll fix production tonight” and started asking, “Is this release worth burning X minutes of the budget?”
- It created a simple rule for trade-offs. During peak sales we tightened the budget threshold for new feature rollouts; during quiet weeks we allowed more experimentation.
- It reduced pager drama. With an SLO-backed runbook, we differentiated between acceptable blips and real incidents that merited waking people up.

A practical 30‑minute playbook to get started
1. Choose one SLI and a 30-day SLO
   - Keep it narrow: e.g., "Payment API success rate." Wider SLOs feel good but are hard to measure accurately.
2. Convert SLO to an error budget number
   - 99.9% -> ~43.2 minutes/month. 99.95% -> ~21.6 minutes/month. Pick what reflects your product and customers.
3. Instrument and measure
   - Use whatever you have: Prometheus, CloudWatch, or a simple success-rate metric logged to a dashboard. Accuracy matters; an over-counted error skews decisions.
4. Define a burn policy (simple thresholds)
   - Burn <25%: safe to continue normal launches.
   - Burn 25–50%: review risky releases; increase automated checks.
   - Burn >50%: pause non-critical launches, mobilise stability fixes.
5. Tie the policy to concrete actions
   - E.g., if burn >50% for 7 days, freeze feature releases until SLI is back within SLO for a rolling 3-day window.
6. Communicate visibly
   - A one-line Slack status or a dashboard widget that shows remaining minutes removes guesswork.
7. Blameless postmortems and replenishment
   - After incidents, do a short postmortem and prioritise work that replenishes the budget (root-cause fixes, better tests, or feature rollbacks).

Real constraints and tradeoffs (what will bite you)
- Measurement errors matter: flaky metrics will either make you too cautious or too reckless. Expect a tuning phase.
- It's easy to game. Teams might hide incidents by tweaking alert thresholds to “save the budget.” Counter with audits and blameless postmortems.
- Not a substitute for business context. For payments, you may need 99.99%+ for regulatory reasons—error budgets don't eliminate that requirement, they just help manage trade-offs.
- Cultural friction: we had to retrain product managers used to “ship daily” to live with occasional gating. That took fortnightly conversations and one real outage example to sink in.

Tools that actually work for small teams in India
- Start cheap: Prometheus + Grafana, or CloudWatch with a simple dashboard. A Google Sheet works for the very small, as long as the metric is trustworthy.
- Alerts: route only actionable alerts to people. Use a lightweight on-call rotation and escalation policy (we used PagerDuty for escalations; Opsgenie also fits).
- Automations: feature flags + Canary deployments are the best investments to spend your budget wisely.

Example numbers we used
- We set SLO = 99.9% on our payments service (43.2 min/month). During Diwali sales we tightened policy so only critical patches could go out.
- In a month with a buggy third‑party SDK, we burned 60% of the budget in two incidents. The policy triggered a release freeze and two engineers focused on fixes for three days; the budget returned to healthy levels within 10 days.

When to not use an error budget
- If your product is life-or-death (medical devices, some safety systems) — you're not negotiating with minutes.
- If your team lacks basic monitoring. An error budget built on bad data is worse than no budget.

The down-to-earth truth: it’s a governance tool, not magic
An error budget won't reduce errors by itself. It gives you a shared language and a visible constraint to make sane trade-offs. In our case it stopped the all-nighters from becoming the default and made launches feel like informed bets instead of heroic gambles. We still had messy incidents—sometimes we miscalculated third-party risk or underinvested in testing—but we stopped letting those incidents define our culture.

If you try this, start narrow, keep the math simple, and be honest about your metrics. And when someone asks whether reliability should win over a new feature, point to the dashboard and have the conversation. It’s the kind of argument an engineer, a product manager, and a CTO can all understand without anyone having to sacrifice another weekend.

Thanks for reading—if you want, ping me a one-line description of your SLO and I’ll tell you roughly how many minutes you’re willing to lose this month.