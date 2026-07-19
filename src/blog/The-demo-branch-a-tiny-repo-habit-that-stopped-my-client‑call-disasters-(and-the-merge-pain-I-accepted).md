---
title: "The demo branch: a tiny repo habit that stopped my client‑call disasters (and the merge pain I accepted)"
pubDate: 2026-07-19
description: "How I started using a single persistent 'demo' branch per repo to keep client demos stable, the tiny rules that make it safe, and the maintenance tradeoffs I learned the hard way."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden table showing code in an editor, with a coffee cup beside it"
  caption: "Photo by Glenn Carstens‑Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["developer-tools", "git", "developer-experience"]
---

The client demo started with a spinning loader and ended with me apologising on a jittery Google Meet while a product manager counted down the minutes. We were two commits away from the "nice-to-have" feature that the sales team had promised. Someone had force‑pushed a debug config, another had rebased onto a half‑migrated DB schema, and our staging that used to be reliable now returned 500s.

That was the third demo this quarter that failed for reasons that were obvious only five minutes before the call. I'd tried better checklists, stricter feature flags, and even a "no pushes on demo day" rule. Those helped a little. But demos still felt like gambling.

What ended the roulette was embarrassingly simple: one persistent branch in each repo called demo. It lives beside main and staging. It’s small, opinionated, and guarded. We deploy it to a cheap ₹300/month VPS that’s only for demos and client calls. When the demo works, we keep it that way.

Why a demo branch, not staging?
Staging is for QA. Staging mirrors production and is where integration tests run. It changes a lot. For demos, you want repeatability.

A demo branch is:
- A curated snapshot of product flow that must not change mid‑day.
- The place where we merge things only after an explicit “demo ready” checklist.
- The canonical source for what we show to customers.

How we use it (practical rules)
I won't sugarcoat this: the branch adds friction. But it's controlled friction. Here are the real rules we adopt — short, concrete, non-negotiable.

1) Demo is opened only by a named owner for a call.
Before a demo, the developer who owns the story creates a feature branch from demo, works, and opens a tiny PR back into demo with:
- A screenshot or video of the flow.
- A one‑line rollback instruction (which service to restart, what env var to flip).
- Confirmation that the change uses demo credentials / scrubbed data.

2) Two green checks before merge.
Automated smoke tests (10–20s) must pass. One manual sanity check from the owner is required: they click through the exact path we'll demo. No exception. This is the single step that stopped half the surprises.

3) Demo uses isolated infra and test creds.
We pay ₹300/month for a small VPS (lightsail/ovh). Demo points to a small DB snapshot with fake users. Payment integrations use our sandbox accounts. No real webhook endpoints. If a sales rep needs to test a client's payload, we create a short‑lived staging fork, not a demo change.

4) No permanent features live here.
Demo isn't a long‑running feature branch. Merges have to be deliberately minimal: a single feature, clearly labeled demo‑only if needed. If something in demo is meant for main, someone must open a PR to main separately. We accept duplicated work sometimes. It’s annoying, but deliberate duplication beats a client meeting derailed by a migration bug.

The tradeoffs I accepted (and a failure)
This approach worked fast, but it’s not free.

- Merge overhead: We ended up with more small PRs. Developers grumbled. I accepted that friction to avoid embarrassment. Teams got faster at small, focused PRs. But it did make big refactors harder — you have to coordinate main, staging, and demo.

- Bitrot: Demo can drift. We set a weekly job that rebases demo onto main and runs the smoke tests; if it fails, a dev is paged. That solved most drift, but not all.

- The day it failed publicly: Once, a demo was merged with a debug flag enabled that logged internal user IDs. It was visible during a client call (we removed the recording), and we had to explain. The failure wasn't because the demo broke — it worked too well and exposed data we hadn't scrubbed. After that, we added an automated scrubber for demo datasets and a checklist item: "no PII in demo DB."

- Dependence on a cheap VPS: The ₹300 VPS model worked until the month the payments on our corporate card failed and the VPS was suspended two hours before a major demo. We now have a fallback — a local "demo runbook" that lets someone run the demo from their laptop and a small battery UPS for the presenter. Again, a real-world constraint: corporate cards and UPI rounding can bite you; keep a manual backdoor.

What changed in day‑to‑day work
Two things happened quickly.

First, demo calls stopped breaking from unrelated QA churn. People who previously avoided demos now volunteered — because the ritual was predictable.

Second, we traded some continuous integration purity for human confidence. Our releases still run on main → staging → prod. Demo is parallel. It means more coordination, but fewer humiliations in front of customers who are buying on perception.

When not to use it
If your product is purely API and you demo via Postman scripts or if you have comprehensive UI test automation that runs and stabilises staging for you, a demo branch is redundant. For small single‑developer side projects it's overkill too.

A genuine takeaway
Demo day is a different risk profile than production. Treat it differently. If you care about predictable demos, a guarded, owned demo branch with a cheap isolated deploy is a small cost for massive upside: fewer frantic rollbacks during calls and fewer "sorry, can we reschedule?" emails.

I still wonder about the right balance between automation and human sanity checks. We've automated the smoke tests; we haven't automated the nervous presenter. That one is still on us.