---
title: "The one‑file ADR habit that stopped our weekly architecture fights"
pubDate: 2026-07-20
description: "How I made short, single‑file Architecture Decision Records (ADRs) a PR-first habit — the tiny ritual that replaced hour‑long debates and the time it accidentally blocked a hotfix."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a notebook and a cup of coffee"
  caption: "Photo by Sergey Zolkin on Unsplash"
  creditUrl: "https://unsplash.com/@szolkin"
tags: ["developer-practices", "architecture", "teamwork"]
---

It was 4:15pm on a Tuesday and we were back to the same argument: "Should we keep payments in the main app or extract a service?" Two engineers had drawn diagrams on Slack that contradicted each other. The senior engineer and the product manager were pushing for different tradeoffs. The meeting had already eaten an hour. There were no new facts — only louder opinions and the usual “we’ll figure it out later” fallback.

I was tired of repeating the same conversation every sprint. So I started forcing a small, awkward ritual: if we were going to make a change that people might care about, someone had to open a one‑file ADR (Architecture Decision Record) as a pull request. No slides. No long RFC. One markdown file in the repo, under docs/decisions, with a strict template and a clock on it.

Why a PR? Because everything else lived in PRs: code, migrations, tests. Design decisions should too. Making it a PR forces a concrete proposal, an owner, and reviewable comments — instead of another ephemeral Slack debate.

What the file looks like (my actual template, 120–250 words)
- Title: short, declarative
- Context: one-paragraph problem statement
- Decision: explicit sentence (“We will extract payments into payments-service.”)
- Consequences: immediate consequences, both technical and product, with rough cost estimates (dev days, infra ₹/month)
- Alternatives considered: 2–3 bullets with one‑line tradeoffs
- Review TTL: a date after which the ADR becomes accepted unless a clear blocker is raised

I keep it terse by design. If you need a 3,000‑word architecture doc, write that later. ADRs are for recording the decision and why it was made right now.

How this changed our conversations
The first win was immediate. The PR made debates concrete. Instead of “I think we should extract,” people had to write the actual decision and attach the tradeoffs. Reviewers stopped arguing abstractly and started asking precise questions the author had to answer in the file.

Making the ADR a PR also solved ownership. When a decision needed rework, there was an author and a thread to reopen. When someone later asked “why did we do this?” we had a link, not a hazy memory.

Two behaviour changes that mattered:
- Forced costing: adding a rough cost estimate (e.g., "2 dev-weeks, ₹2,000/month infra") immediately surfaced hidden constraints. People stopped building academic architectures and started thinking in rupees and release dates.
- Review TTL: adding a short acceptance window (usually 48–72 hours for non-blocking decisions) prevented endless bikeshedding. If no concrete blocker shows up, the ADR is merged and we move on.

The failure I actually learned the most from
Three months in we merged an ADR that enforced a public API contract for an internal service. The ADR was strict: no breaking changes without a cross-team migration plan. Two weeks later we had a critical bug in production that required a breaking fix to ship a hotfix. The merged ADR blocked the quick rollback path. I had created process friction that delayed a hotfix by a day and cost us a small SLAs penalty.

That taught me two things. First, ADRs must be opinionated but pragmatic. You can prescribe safety and still include an escape hatch. My current template now includes an "Emergency escape" section with the exact process and owner for one-off hotfixes. Second, the team needed a culture rule: an ADR can require approvals, but in emergencies the on-call engineer can take unilateral action and document it after the fact. We codified that and saved a lot of stress the next time.

The tradeoffs I accepted
- Overhead: a one‑file ADR is easy, but it still takes 20–40 minutes. That’s time I could have used to ship a bugfix. Some people used ADRs to slow down decisions. I stopped that by refusing to accept vague ADRs; if it reads like a brainstorm, I close it and ask for the author to rewrite into the template.
- Staleness: ADRs get outdated. We started adding "status" (proposed/accepted/retired) and a quarterly sweep where authors of older ADRs either mark them retired or add a short update. Yes, it's more work. But finding an answer in a file beats re‑debating a year‑old choice.
- False authority: some teams treated merged ADRs as law, which killed experimentation. To counter that, every ADR includes "when to revisit" and the team agreed that measurable failure conditions can reopen a decision.

How this fits India specifics
Small Indian product teams often juggle tight deadlines, stakeholder pressure from sales or management in ₹ figures, and on-call constraints. Adding rough cost lines in ADRs (developer days, expected EC2/RDS cost changes in ₹) forces the conversation into the language stakeholders care about. It also helps during monthly stakeholder reviews in Bengaluru offices where timelines and budgets are always under scrutiny.

A short example that saved us a week
We had a payments latency spike on a busy day. One PR‑ADR proposed adding a cache layer. The PR included consequences ("adds ₹1,500/month Redis, 3 dev days") and a rollback plan. Ops approved with one comment, and the change shipped in 48 hours. No meeting. No rehashing. The ADR became the single source for why we chose caching over moving to a new payment provider.

One practical rule I force now
If a decision could affect more than one team, it must be a PR ADR and include a review TTL. If it touches only one small module, a short GitHub issue is fine. This keeps ADRs proportional.

What I walked away with
ADRs aren't elegant architecture essays; they're short, reviewable records that stop repeated arguments and tie decisions to costs and owners. The real win isn't fewer debates — it's fewer repeated debates. The honest tradeoff: it's extra work and it can slow you down if you make documents sacred. Do not worship your ADRs. Use them as lightweight contracts you can change when metrics say you’re wrong.

I still have the Slack threads. I still have angry late‑night debates. But when it matters, we write it down, estimate the cost in dev‑days and rupees, set a TTL, and ship.