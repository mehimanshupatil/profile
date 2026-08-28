---
title: "The 9‑Minute Exit Ritual That Actually Shut Down My Workday (and the night it missed a bug)"
pubDate: 2026-08-28
description: "A short, concrete end‑of‑day ritual I use to stop replying to Slack at night — how I built it, the one failure that forced an exception, and why it still works in Indian product teams."
author: "Aanya Mehra"
image:
  url: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1600&h=800&fit=crop&auto=format"
  alt: "A person closing a laptop on a wooden desk with a mug and notebook nearby"
  caption: "Photo by Brooke Lark on Unsplash"
  creditUrl: "https://unsplash.com/@brookelark"
tags: ["work-life balance", "remote work", "routines"]
---

My phone buzzed at 8:14 pm with a terse Slack pings: a flaky payment job had retried itself into a stateful mess. I was closing my laptop, kettle steaming, already five minutes into my exit ritual — headphones off, status changed, mental checklist ticked. I ignored the message. I had been trying to enforce a boundary for months: work ends at 7:30 pm unless I'm on-call, and I’d built a short ritual to make that stick.

That night the bug compounded and, because I wasn't watching, a teammate spent an hour juggling refunds at 10:00 pm. I felt awful. But that failure also taught me why the ritual needed a small, explicit exception instead of being brittle. I rewrote the rule that week — not to be laxer, but to be smarter about how emergencies find me.

Why I needed a ritual
Before I had structure, my "shutdown" was: close tabs, hope for the best. In practice I responded to messages until 10–11 pm, then lay awake replaying work conversations. I lived in two cities at once — Bengaluru office hours and 24/7 product telemetry.

I tried a hard rule ("no work after 8 pm") and it failed because of context bleed: unread threads, half-finished deploy notes, and a company culture where people expected reply velocity. What worked was a tiny, repeatable sequence that signals to me and to the team that I'm offline. The goal: reduce cognitive friction so stopping is easier than scrolling.

The 9-minute ritual (what I actually do)
I run this every weekday at 7:20 pm. It’s nine minutes. Yes, I time it at first. It’s short enough to do consistently and long enough to surface the few things that leak into night.

Minute 0–1: Stop current task, write one sentence
I type a single-sentence status in the ticket/PR I'm on: "Paused at X — next step: Y." No paragraphs. This beats "I'll remember" and saves future me three interruptions. Because I use GitHub and Linear, a one-liner in the PR description or ticket is enough.

Minute 1–3: Triage fast notifications
I scan Slack and email channels where I get operational pings (alerts, release #announcements, client channels). If something is obviously urgent (SEV channels, payments failing), I deal with it. If it is a question that can wait, I add a "waiting" emoji and schedule a short follow-up tomorrow morning.

Minute 3–5: Set visible signals
I change Slack status to "Offline — available 9:30 am" with a green tea emoji. I switch my Do Not Disturb on my phone for 8 hours. Team knows my status change; it reduces impulse DMing. For critical teams we use a pinned "on-call" rota and an escalation doc. For me, the visible signal prevents the "quick check" trap.

Minute 5–7: Push one cleanup commit or PR comment
If there’s one small action that prevents a blocker tomorrow — a CI retry, a comment clarifying required input, a tiny script fix — I do it. It’s a micro-investment that lowers morning friction for everyone.

Minute 7–9: Physical shutdown
I close the laptop, remove headphones, and put the device on a shelf (not on the bed). I make tea if I’m home, or switch to a non-work activity if I’m in a shared flat. The physical act is crucial — it trains my brain that the ritual is finished.

Why it works (for me)
- It’s visible. Changing status and leaving one-line notes tells other humans I'm off. Indian startups still expect fast answers; this reduces social pressure to reply.
- It’s tiny. Nine minutes is less than most "one last thing" spirals. I can commit to it even on rough days.
- It prioritizes handoff, not avoidance. The goal isn't to dodge work but to leave tomorrow clean.

The tradeoff I accepted
Boundaries cost responsiveness. I lost a couple of "quick saves" — nights where a five-second reply would have prevented a rollback. One such night led to the 8:14 pm incident I mentioned: my rigid ignore rule delayed awareness, and a teammate had to scramble.

After that I added a deliberate exception: a single "exception channel" and a low-noise alert. We created a tiny policy — any issue that truly needs an immediate human is posted to the #ops-now channel and triggers a PagerDuty toast or a WhatsApp call for the on-call engineer. For non-on-call team members, a message there will include "ACTION: contact Aanya" so I can decide whether to take it. It’s imperfect — it relies on people choosing the right channel — but it saved me from being the "always-on" safety net.

The failure that shaped the rule
My early attempts were either too soft (no ritual at all) or too strict (ignore everything). Both failed. The strict approach created a perverse outcome: teammates stopped posting critical early warnings because they assumed I'd ignore them. That night when the payment job glitched, the escalation pattern wasn't followed and the rollback became harder.

So I changed my mental model: the ritual is about predictability, not protection. I want teammates to know what they'll get when they ping me — and how to reach me if it's truly urgent.

Practical constraints I still live with
- Mumbai/Bengaluru work culture: even with status set people assume availability. My ritual reduced the noise but didn’t erase cultural expectations overnight.
- Internet/power flakiness: sometimes I have to keep a mobile hotspot or ₹2,000 UPS on standby for planned releases. I learned to visibly note in release threads whether I’m in a location with backup power.
- Manager expectations: I negotiated the boundary explicitly during my appraisal cycle. Without that conversation, the ritual is political fluff.

What I walked away with
The ritual taught me two things: one, an exit habit works because it externalizes the handoff; two, rules without an exception path are brittle. So I keep the nine-minute ritual and a tiny, well-known exception mechanism. It restored evenings without pretending incidents don't happen.

If you try this, start with one sentence per task and a visible status. Make the exception path explicit. And when you fail — as I did — treat it as a signal to fix the process, not to break the boundary.

No manifesto. Just a small habit that makes shutting down repeatable enough to matter.