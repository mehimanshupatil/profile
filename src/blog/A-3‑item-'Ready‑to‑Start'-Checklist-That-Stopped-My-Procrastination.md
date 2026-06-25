---
title: "A 3‑item 'Ready‑to‑Start' Checklist That Stopped My Procrastination"
pubDate: 2026-06-25
description: "I stopped staring at a ticket and actually started shipping by requiring three things before I click 'start' — reproducible case, one‑line acceptance, and a first safe action."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop, notebook, and coffee cup on a wooden table with a person writing in the notebook"
  caption: "Photo by Christin Hume on Unsplash"
  creditUrl: "https://unsplash.com/@christin_hume"
tags: ["productivity", "habits", "focus"]
---

It was 3pm, my Wi‑Fi had decided to take a siesta, the CI queue was an hour long, and I was looking at a bug that had sat in my board for three days. I could see the fix in my head — mostly — but every time I opened the issue I’d close the tab and do something that felt useful: answer Slack, tidy an old branch, open 12 tabs. I wasn’t blocked so much as paralyzed. Small steps looked riskier than fiddling with my inbox.

That cycle—stare, stall, fake‑busy—used to be my default. I tried Pomodoro, task lists, pairing. Each helped for a while, then the same thing happened: friction before starting. The trick that finally stuck was ridiculously small and precise: before I "start" any ticket, it must pass my 3‑item ready‑to‑start checklist. No exceptions, unless it’s a declared hotfix.

Why the checklist exists

Most procrastination on engineering tasks isn’t laziness. It’s uncertainty bleeding into friction.

- Can I reproduce the problem quickly? If not, starting feels like throwing darts.
- What does “done” mean exactly? Vague acceptance = infinite polish.
- What’s the first safe action I can take? Without that, you’re waiting for inspiration.

When you make those uncertainties explicit and turn them into a short gate, you eliminate the huge, vague decision (“should I start now?”) and replace it with three small, answerable checks.

The three items (exactly how I use them)

I kept this list intentionally tiny. Each item takes at most ten minutes to verify.

1) Repro within 10 minutes (or a clear repro strategy)
- My rule: I should be able to reproduce the bug locally, or have a minimal repro steps doc, within 10 minutes. That might be running a unit test, loading a URL, or toggling a feature flag.
- Why 10 minutes? It’s short enough to force a realistic test but long enough to do something non-trivial.
- Practical example: If a payment flow fails on certain bank cards and I can’t reproduce locally, I write a tiny checklist: "Test card X on staging → logs at /payments → capture request body." That placeholder is enough to start investigations without the paralysis of "I don’t know how to reproduce."

2) One‑line acceptance: user impact + done criteria
- I force myself to write a single sentence in the ticket before work starts: "[User impact]. Fixed when [observable behaviour]."
- Example: "Users on mobile cannot complete checkout; fixed when checkout flow returns 200 and order is created in DB for a test user."
- This saved so many back-and-forths. Reviewers stopped asking "Is this the bug?" because the ticket already answered it.

3) The first safe action (timeboxed)
- Before coding, I define the first commit or experiment and timebox it (15–45 minutes). The goal is to reduce the barrier to the first keystroke.
- Examples: "Add a log around X to confirm payload" or "Create a failing test for the edge case." If the first action will touch 10 files or requires a design sync, I break it down further.
- The timebox prevents me from getting lost in a "perfect first attempt" spiral. If the first attempt fails, I stop, reassess, and plan the next 30 minutes.

How I actually use this in a chaotic Indian startup context

Our CI queues in Bengaluru sometimes mean a 40‑minute wait. Mobile network testing chews data. Office Wi‑Fi dies for ten minutes at random. The checklist is particularly helpful here: by nailing a repro and a first local action, I can keep momentum without relying on CI or perfect connectivity. If CI is slow, I run the quick local checks first. I also stick the one‑line acceptance in the Jira title so reviewers read it in the first glance on their cheap phone over a flaky network.

When it failed (and the rule I added afterwards)

It wasn’t perfect. Two honest failures:

- The hotfix that stalled: Once, a production issue was eating revenue. I followed the checklist and spent 25 minutes chasing a reproducible case that didn’t exist in dev. The pager escalated while I was trying to satisfy the rule. Lesson: time matters. I added an explicit "hotfix exception": if the issue is high-severity (and flagged as such), skip the reproducibility gate and go for the mitigation + post‑mortem plan.

- The rigidity problem: I first enforced the checklist as a hard policy across the team. Designers and others doing exploratory work found it constraining. The checklist is for well‑scoped engineering tickets. For design spikes or research tasks, a much looser "intent" note is fine. We now tag tickets as "Exploratory" and don't apply the gate there.

The tradeoffs I accepted

This habit slowed down my initial "blunder in and try" style. Sometimes a quick, naive patch would have worked and I over‑engineered the repro. But the tradeoff is deliberate: I trade a few minutes upfront for far fewer mid‑task stalls and review churn. On average I ship one more meaningful change per day because each start is real.

A small habit, but it changed my mornings

The checklist is boring. It forces me to do slightly awkward things: write a one‑liner, run a local script, plan a tiny first commit. But removing the question "do I start?" matters. If you stare at tickets, try this for a week. Make exceptions for hotfixes and exploratory work. If it still feels like bureaucracy, tighten the time limits — make the repro a 5‑minute smoke test.

Takeaway: If starting is your bottleneck, shrink the decisions you have to make before the first keystroke. My three items turned "maybe later" into "started now" more reliably than any timer or motivational note ever did.