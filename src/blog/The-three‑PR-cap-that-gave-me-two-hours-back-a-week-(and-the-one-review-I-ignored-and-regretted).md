---
title: "The three‑PR cap that gave me two hours back a week (and the one review I ignored and regretted)"
pubDate: 2026-04-21
description: "How I stopped letting tiny code reviews fragment my day: I capped myself at three PRs a day, scheduled focused review blocks, and learned the tradeoffs the hard way."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk, an open notebook, a cup of coffee, and a smartphone."
  caption: "Photo by Kelly Sikkema on Unsplash"
  creditUrl: "https://unsplash.com/@kellysikkema"
tags: ["productivity", "code review", "focus"]
---

It was 11:07 a.m. and I’d already opened five pull requests in five different repos. Slack kept chirping. Each PR was small—typo fixes, UI tweaks, a missing await—but every tiny review yanked me out of the thread of work I was trying to finish. By noon I had a meeting, a half‑done bug, and a fragmented brain that took the rest of the afternoon to stitch back together.

I tried the usual fixes: batching reviews into a “review hour”, muting notifications, asking colleagues to add more context. All helped a little. But the interruptions kept sneaking back: an urgent ping at 9:30, a “quick” ask at 2:15, a tiny patch at 4:50. The turning point came after a week where I shipped nothing meaningful, yet my inbox looked impressively empty. I was busy. Not productive.

So I gave myself a simple rule: no more than three PRs reviewed in a day, and I only touched them during two scheduled review windows. No exceptions without an explicit “please escalate” tag from the author.

How it actually worked

Why three? Because it’s small, enforceable, and still feels like help. One PR can take 5–10 minutes if it's clean. Three lets me help teammates without turning my day into a relay of tiny contexts.

Implementation details you’ll care about:
- Two review windows: one at 10:30–11:15 (after my morning stack-up and coffee), another at 16:00–16:45 (when I’m lowering the energy ladder). These are fixed calendar blocks so colleagues know when I'll be available.
- A simple queue: authors add "review-request" to the PR title and drop the link into a dedicated Slack thread. I review in thread order.
- Escalation: if a PR is actually blocking a release or a hotfix, authors add the label "urgent‑review" and ping me with a one‑line reason. That’s the only allowed exception to the cap.
- Feedback: I require a minimal description and a screenshot for UI changes. Bad PRs get a "needs work" comment and get bumped to the end of the queue.

The first week felt strange. People who’d quietly expected instant reviews pushed more context into their PRs. Junior devs improved descriptions because they noticed their PRs stayed in the queue longer. Senior devs adopted the Slack thread habit. The team shipped broadly the same, but the workdays felt calmer.

What it bought me

Two hours a week. That’s the real number. Not an abstract productivity boost. I measured it by tracking my focused sessions in my calendar and comparing weeks before/after. With three PRs/day and fixed windows, I got two solid 45–60 minute focus blocks back every week—enough to move a feature forward or finish a thorny bug.

Other wins:
- Better review quality. When I wasn’t rushing through dozens of tiny PRs, my comments became more thoughtful. Fewer bikesheds and more structural suggestions.
- Less context switching. I finished more tickets end‑to‑end rather than doing a half here, a half there.
- Team discipline. People started using labels and screenshots. That’s low effort but high returns.

The tradeoff I didn’t expect

I learned the hard way that rules require buy‑in and a fail‑safe.

Two months in, a backend change landed in production at 2 a.m. on a Sunday from a contractor. It was a minor migration that could wait, but it broke payment flows for a subset of users. I saw the Slack thread at 8:30 a.m. and instinctively stuck to my three‑PR rule. I had zero reviews logged for the day and three blocked PRs in my queue. I chose to follow the rule.

We lost a few hours of revenue that day. The contractor had labelled the PR "minor", hadn’t added a test, and didn’t alert anyone to the downstream payment job dependency. I should have made an exception. I didn’t. I regretted it.

After that I changed the escalation clause: any change touching payments, billing, or authentication must include a "safety checklist" and a mention of the on‑call rotation. That checklist includes who to ping if something goes wrong and whether the change needs a pre‑merge smoke test. The cap stayed, but the guardrails got tighter.

The failure also taught me something else: rules make you lazy about anticipating risk. When I was doing wild, ad‑hoc reviews all day, I often caught cross‑cutting issues because I saw many parts of the system in motion. The cap narrowed my exposure. The checklist restores it.

Where this model fails

This isn’t magic. It breaks when:
- The team is tiny and everyone expects instant reviews (early‑stage startups).
- You’re the only person who can approve releases or has the deploy keys. Then the cap is meaningless unless you automate approvals.
- The org culture treats review speed as a metric for responsiveness. If managers insist on <1 hour review times, you’ll need negotiation.

It also pushed some work to the evenings for a couple of teammates who wanted reviews immediately. I didn’t like that. So I iterated: fixed windows, explicit escalation rules, and a quick chat with leads to realign expectations. That removed most edge cases.

What I actually walked away with

The lesson isn’t “be strict for the sake of discipline.” It’s this: reviews are a team resource, not your personal to‑do list. Treat them like meetings — schedule them, limit them, and make the cost of interrupting explicit.

If you want to try this:
- Start with one day a week where you enforce the three‑PR cap rigidly.
- Ask your team to use a single Slack thread for requests.
- Insist on minimal PR hygiene (description, test, screenshot) before you accept it into the queue.
- Define clear, small exceptions (deploy blockers, payments, security).

I’m still tweaking the cap. Sometimes I go two, sometimes four, depending on releases. But the rule changed my default reflex from "fix it now" to "plan the fix"—and that tiny habit returned my afternoons.