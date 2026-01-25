---
title: "Ship Fewer Surprises: How a One‑Paragraph Pre‑Mortem Email Saved My Team Weeks"
pubDate: 2026-01-25
description: "A short, practical pre-mortem approach that prevents rework and aligns teams—tested on small Indian engineering teams juggling remote work and tight deadlines."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=2000&h=1000&fit=crop"
  alt: "A small team around a table, notebooks and laptops, discussing and writing on sticky notes."
  caption: "Image credit: Brooke Cagle / Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["pre-mortem", "team process", "productivity"]
---

Last quarter we shipped a feature that looked simple on paper and blew up into a three‑week firefight. The problem wasn’t engineering talent or QA bandwidth — it was expectations. Different teams assumed different success criteria, and by the time we discovered the mismatch, we were knee‑deep in rollback plans and apologetic product updates.

After that, I started sending a tiny, one‑paragraph pre‑mortem email whenever a ticket crossed a certain complexity threshold (not every bugfix — just things that affect users, infra, or multiple teams). It’s now part of our rhythm. The emails are short, boring, and they save us time every month.

What a pre‑mortem email is (and isn’t)
- It’s not a long doc or a meeting. It’s a focused, asynchronous prompt: “Assume this release fails in a specific way — what happens next?”
- It forces explicit failure modes, ownership, and rollback thinking before code lands.
- It’s intentionally cheap: one paragraph, a couple of bullet points, sent to the stakeholders who will be impacted.

Why this works in real teams
- Humans are optimistic by default. When planning we say “it’ll be fine” and skip edge cases. A pre‑mortem forces pessimism in a controlled way.
- Asynchronous communication suits Indian distributed teams where stakeholders are across timezones or have packed calendars. You get better input than a hurried 15‑minute meeting.
- It reduces costly discovery later. The earlier you identify “this might break payment reconciliation” the fewer users are affected.

A practical pre‑mortem you can steal
When a feature or change meets your risk criteria (cross‑team, affects data, infra change, or >2 engineers), send an email or Slack thread with:

Subject: Pre‑mortem: <short feature name> — release date <dd‑mmm>

Body (one paragraph):
- Quick description (1 sentence)
- Likely failure mode we should treat as realistic (1 sentence)
- Immediate user impact (1 sentence)
- Quick mitigation/rollback step + owner (1 sentence)

Then add 2–3 short bullets: stakeholders to ping for release, any required downtime windows, and a link to the deployment runbook or PR.

Example:
Subject: Pre‑mortem: Auto‑split payouts — release 10 Feb
Body: We’re deploying auto‑split payouts to handle marketplace sellers. Realistic failure: duplicate payouts for sellers using older payout accounts due to legacy mapping edge cases. User impact: some sellers may receive duplicate transactions requiring manual reversal and support tickets. Mitigation/rollback: Add feature flag and disable via config (owned by Anjali); support playbook prepared by Siddharth. Ping: payments, support, reconciliation.

Why one paragraph beats a long checklist
If you crafted a 10‑page risk assessment, half the team won’t read it. A one‑paragraph pre‑mortem is quick to produce, easier to act on, and perfectly suited for the attention economy of most product teams. It also creates a record you can search later: “What did we assume about payouts before Feb?” That has value during post‑mortems and audits.

Real constraints and tradeoffs
- It doesn’t catch everything. You’ll still get surprises — this reduces probability and impact, not eliminate them.
- It adds a small overhead. On tight deadlines, writers sometimes skip it. You need a light enforcement mechanism (I added it as a required checklist item on PR templates for risky PRs).
- It depends on honest failure assumptions. In hierarchical contexts common in Indian firms, junior engineers may be reluctant to voice worst‑case scenarios. Encourage psychological safety: leaders should explicitly model pessimism by writing their own pre‑mortem for a big change.

How to make pre‑mortems actually stick
- Automate the trigger: Add a label (e.g., risk/high) or a PR template checkbox that nudges the author to send the pre‑mortem. We added a GitHub action to post a comment with the pre‑mortem template when the label is applied.
- Make it visible where decisions live: link the pre‑mortem in the release notes, deployment checklist, and incident runbook.
- Rotate ownership: encourage PMs, tech leads, or even QA to author them. Different perspectives reveal different realistic failures.
- Use them as post‑mortem seeds: when something does go wrong, compare the pre‑mortem to reality. Did we underestimate this risk? Which assumption failed? Those are high‑value lessons.

An India‑specific wrinkle
In many Indian companies, product and engineering decisions are still top‑down. Pre‑mortems work best when they invite dissent, not just permission. I found that when senior engineers wrote the first few, junior folks felt safer contributing. Also, because many teams are distributed across offices and remote freelancers, the async nature of an email pre‑mortem lets people contribute without scheduling headaches or timezone friction.

A small cultural shift with outsized ROI
We’re not removing all surprises. We still have post‑release firefights occasionally. But the frequency of “we didn’t know this would happen” collapses. The extra three minutes I spend drafting a pre‑mortem typically saves multiple hours of cross‑team triage later — and, more importantly, keeps customers from seeing poorly coordinated rollouts.

If you want a single rule to try this week: for the next two sprints, require a one‑paragraph pre‑mortem for any change that touches payments, user data, or infra. See who comments, what assumptions get corrected, and whether your support ticket volume after releases falls. If nothing else, you’ll start conversations you should have been having anyway.

Closing thought: pessimism, in small doses, is a kindness to your future self and your support team. Try the one‑paragraph pre‑mortem — it’s boring, but boring saves you from being the person who says “we didn’t think that would happen” at 2 a.m.