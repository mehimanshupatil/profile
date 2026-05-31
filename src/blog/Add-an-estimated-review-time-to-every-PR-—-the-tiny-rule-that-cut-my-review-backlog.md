---
title: "Add an estimated review time to every PR — the tiny rule that cut my review backlog"
pubDate: 2026-05-31
description: "How a one-line estimate in PR titles (10m, 30m, 2h) helped our Bengaluru startup cut review latency, reduce context switches, and actually made reviewers more considerate."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop at a wooden desk with a notebook and coffee"
  caption: "Photo by Scott Graham on Unsplash"
  creditUrl: "https://unsplash.com/@scottgraham"
tags: ["productivity", "code-review", "team-culture"]
---

It was 9:40 p.m. on a Tuesday. I had a train to catch and a hot desk waiting for me in the next carriage, but my deploy was blocked because a reviewer in another timezone hadn’t signed off. The PR title was “small tweak — some refactor”, the description had five paragraphs, and the reviewer pinged me asking “how long will this take to review?” I had no short answer. They couldn’t schedule it into the fifty minutes between meetings. I missed the train. The patch landed at midnight.

That week I started adding a tiny thing to every branch name and PR title: an estimated review time. It looked like this in practice:

feature/auth-improvements (review:15m)
fix/payment-timeout (review:45m)
chore/update-deps (review:5m)

We paired that with a one-line PR template: “Readme: what changed. Review time: X. Quick checklist: tests, manual steps.” That small, visible signal changed how reviewers scheduled work, and — more importantly — how authors wrote PRs.

Why this matters

At my Bengaluru startup we run a mono-repo, reviewers are often deep in context, and everyone has packed calendars. People don’t need more rules; they need better signals. An estimated review time answers a simple human question: “Can I do this now without fragmenting my flow?” If the answer is “5m”, the reviewer will pick it up in a meeting gap or on the commute. If it’s “2h”, they’ll allocate a focus block.

The mechanics we used (and why they’re deliberately dumb)

- Make estimates visible in the PR title. Editors and mobile notifications show the title first — that tiny bit of metadata gets seen in Slack, in the GitHub mobile app, and in the email subject.
- Author estimates, not reviewers. The person who created the change best knows the scope. If the author says “10m” and it’s wrong, the reviewer updates the PR comment with a new estimate — but the initial guess is valuable for scheduling.
- Two-part PR template. First line: “Estimated review time: X”. Second line: a 1–2 sentence summary ("why this change matters") and a concise checklist ("tests, migration? manual steps?"). This trains authors to compress context.
- Treat estimates as signals, not SLAs. We do not block merges because an estimate was exceeded. We don’t penalize authors whose 15m PR took 40m. We did that first, and it made people defensive.

Results that surprised me

- Review latency dropped. Median time-to-first-review went from ~48 hours to ~18 hours in six weeks. That’s not magic; it’s just people finding 10–15 minute windows to clear small PRs.
- Fewer context switches. Reviewers reported they planned reviews into calendar gaps; engineers measured ~20–30% fewer session breaks during deep work blocks.
- Better PR hygiene. When you have to estimate “5m” you write the PR differently. You trim the description, run the checklist, attach screenshots. That alone reduced rework.
- A measurable tradeoff: a small dip in initial review depth. For a month we saw slightly fewer inline comments per PR on average. Decide before you adopt: do you want faster throughput or more exhaustive immediate reviews? We wanted faster throughput because our release cadence was hurting.

The failure I didn’t expect (and the social thing I had to fix)

Within two weeks someone started gaming estimates. “Estimate 5m” became a way to get a review fast even when the change needed deeper scrutiny. That backfired badly once: a “5m” refactor that touched auth code rolled into staging and caused a rollback. We reacted wrong at first — we enforced a hard policy, kicked off a blamey Slack post, and morale dipped.

What fixed it was simple and human: make the estimate a conversation starter, not a checkbox. We added a single line to our PR template: “If this touches infra/security/payments, mark reviewer ‘required’ and err on the higher side.” We also started a weekly 10-minute “review triage” sync where two people scanned the long-running PR list and re-labeled anything that looked misestimated. That restored trust.

Practical tips that actually make it work (no checklist fluff)

- Use minutes and round: 5m, 15m, 30m, 1h, 2h. Humans understand rough orders of magnitude.
- Enforce the one-line summary in PR body. If you can’t explain the change in two sentences, it’s not a “5m” PR.
- Teach reviewers to update the estimate if it’s wrong. A short comment “re-estimate: 45m — needs manual testing” is a better outcome than silent delay.
- Don’t automagically enforce it. We tried a bot that blocked merges if estimate > 1h and it just created resentment.
- Put the estimate in the branch name too (feature/.../review:15m). That helped when someone skims a git log or a deployment list while triaging.

Where this rule doesn’t help

It won’t cure toxic on-call paging, lack of engineers, or giant architectural PRs that deserve multiple reviewers and design sessions. It’s a tool for the frequent small PRs that clog reviewers’ queues and interrupt focused work. At scale, you also need sane ownership and a signals channel for larger reviews. We didn’t stop doing architecture reviews — we just made it easier to clear the small stuff.

Takeaway

The real win wasn’t the metric improvement. It was the cultural nudge: estimates made authors more succinct and reviewers more intentional. It forced a conversation we were avoiding: “Can you do this now?” Try it for three sprints. Treat the numbers as signals, not promises. If your teammates start gaming 5m estimates, fix the social contract, not the tooling. It’s cheaper and less annoying than missing another train.