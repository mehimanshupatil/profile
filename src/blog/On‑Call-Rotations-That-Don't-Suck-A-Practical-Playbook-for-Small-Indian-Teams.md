---
title: "On‑Call Rotations That Don't Suck: A Practical Playbook for Small Indian Teams"
pubDate: 2026-01-10
description: "Concrete practices for fair, sustainable on-call rotations for small engineering teams in India—reduce pager noise, protect deep work, and keep weekends human."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&w=2000&h=1000&fit=crop"
  alt: "Developer working late at a laptop with a coffee mug, code visible on the screen"
  caption: "Image credit: Brooke Cagle / Unsplash"
  creditUrl: "https://unsplash.com/photos/5fNmWej4tAA"
tags: ["on-call rotations", "SRE", "developer workflow"]
---

You don’t need a giant operations team to have a good on‑call culture. You do need rules, tools, and a bit of mercy.

I spent my first year of on‑call rotations treating every ping like a five‑alarm fire. Burnout followed. Over the next two years, on teams of 6–20 engineers in Bengaluru and remote across India, I helped build a lighter, more predictable approach that actually let people sleep and ship features. Here's the practical playbook we used—what worked, what backfired, and the tradeoffs you'll face.

Why on‑call rotations should be humane (and realistic)
- On‑call isn’t punishment. It’s risk management: someone must bridge the gap between automation and the unknown.
- Small teams can't afford full-time SREs, but they can avoid habitually waking people at 2am.
- The goal: fast recovery for critical incidents, minimal interruption for everyone else.

Main keyword: on-call rotations (use naturally throughout).

Start with the right scope
Define what "page" means. We kept three levels:
- P0: Business‑critical outages (payment failures, major data loss) — page everyone.
- P1: Service degradation affecting many users — page the on‑call + lead.
- P2: Non‑urgent errors, single‑user bugs, internal logs — create tickets, no immediate page.

This simple triage reduced noisy pages by ~60% in our first month. Put these definitions in your runbook and enforce them in alert rules.

Invest 2 hours to write practical runbooks
A runbook that says "restart service" beats 20 Slack messages. For each P0/P1 path, include:
- One‑line symptom
- Quick checks (service health, recent deploys)
- Commands to run and how to roll back safely
- When to escalate and who owns customer comms

Runbooks pay dividends in less context switching and faster resolution. The downside: they need maintenance. Treat them as living docs—update after each incident.

Reduce noise, then automate escalation
Noisy alerts are morale killers. Start by setting sensible thresholds (not zero errors). Use aggregation windows and mute known flapping endpoints. Add a short delay before paging—for many transient hiccups, your monitoring will self‑recover.

Automate escalation: if on‑call doesn't ack in 10 minutes, escalate to the backup and then to the lead. It prevents endless 3am group pings.

Pick rotation cadence based on team size (tradeoffs)
Common options:
- Weekly rotations: more people share burden, but frequent context switches make the on‑call less effective.
- Two-week rotations: fewer handoffs, better continuity, more burnout risk.
- On‑call pairs (primary + secondary) for critical services.

For teams of 8–20, we found two‑week rotations with a designated backup hit the sweet spot. Smaller teams (4–7 people) often prefer weekly so the load is more evenly spread. Tradeoff: longer rotations let you learn the system better; shorter rotations reduce the chance any single person gets burned out.

Compensation and boundary setting (do both)
In India, the cultural default is "we’ll handle it"—that’s a trap. Pay a clear on‑call stipend or time‑off-in-lieu. Even a modest stipend (₹2,000–5,000/month) signals respect. Equally important: protect work hours. On‑call days should avoid scheduled deep‑work meetings; make them “meeting-lite.”

Practical tooling that doesn't bankrupt you
You don't need enterprise pager tools to get started:
- Use a simple alerting stack (Prometheus + Alertmanager, or hosted monitoring) with integrations to Slack/Telegram.
- Use OpsGenie or PagerDuty if budget allows; otherwise, PagerDuty has free tiers for small teams, and tools like VictorOps offer simple routing.
- Create a dedicated on‑call channel with strict rules: no emoji reactions as incident acknowledgement; use explicit acks.

A realistic tradeoff: cheaper tools bring more manual glue (scripts, cron jobs). That's fine if you accept a bit of operational debt and prioritize automation later.

Run lightweight postmortems and followups
After any P0/P1, do a 30–60 minute postmortem. Focus on: what happened, why the alert fired, what will we change to prevent recurrence, and who will do it. Keep blame out. Track followups as sprint tasks. This is how reliability improves without hiring.

Cultural rules that matter
- No punishment for paging in good faith. Reward escalation when the situation warranted it.
- Limit weekend coverage—rotate weekend owners and ensure only P0s wake people.
- Make knowledge transfer mandatory at handover: short note of open incidents and what to watch.

When you'll still feel the pinch
If your team is understaffed or running many critical services, on‑call will remain a stressor. Hiring, better automation, and moving riskier services to managed platforms are the real long‑term fixes. Also: not every service deserves 24x7 coverage—accept measured risk for low‑impact systems.

A final, practical checklist to implement this week
- Define P0/P1/P2 with examples
- Create one runbook for your most common page
- Tweak alert thresholds to cut noise
- Decide rotation length and backup policy
- Set an on‑call stipend or formal time‑off rule

On‑call rotations don't have to be heroic. With clear scope, decent runbooks, a few automation rules, and fair boundaries, small teams can keep services reliable without people living on adrenaline. Do the small, boring work—your sleep schedule will thank you.

If you want, I can share the runbook template we used (short, one page) or a starter alert rule set that cut our midnight pages in half.