---
title: "No Laptop in the Bedroom on My On‑Call Weeks (and the Week I Broke the Rule)"
pubDate: 2026-05-08
description: "I stopped taking my laptop to bed during on‑call weeks. It fixed my sleep and stress more than I expected — until a power outage forced me to break the rule and reveal the tradeoffs."
author: "Aanya Mehra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&h=800&fit=crop&auto=format"
  alt: "Person sitting on a couch using a laptop with a cup of tea on the table"
  caption: "Photo by Andrew Neel on Unsplash"
  creditUrl: "https://unsplash.com/@andrewtneel"
tags: ["work-life", "on-call", "habits"]
---

It was 2:10 a.m. My phone buzzed. I opened my eyes, grabbed the laptop from the bedstand, and within ten minutes I’d rebuilt the failing worker, pushed a hotfix, and convinced myself I’d be able to get back to sleep.

I didn’t. My heart pounded for hours. I replayed every console line I’d read. At 4 a.m. I finally turned the laptop off and lay awake. That was the night I decided: no laptop in the bedroom on on‑call weeks.

This reads like something small. It wasn’t. For me, the laptop in bed was a trigger. As soon as the screen lit, my brain shifted from “fix this” to “solve all of it,” and I took the rest of the night with me. The solution had to be physical, obvious, and enforceable.

What the rule looks like
- Bedroom is a device‑free zone for the duration of my on‑call rotation except for my phone with a single alert profile.
- I keep an “on‑call bag” in the living room: power bank (₹1,200), a spare charger, an ethernet cable, a small notebook, and printed runbook pages for my top 5 incident classes.
- My laptop lives on a small side table in the living room plugged into the UPS that powers the router (I keep a ₹3,500 mini UPS there). If I need to work, I go sit at that table. I log in, fix, log out, leave the laptop open as a status artifact, and step away.
- Phone is on Do‑Not‑Disturb except for alerts from PagerDuty/Slack and a dedicated vibration pattern I can recognise without looking.

Why the physical boundary matters
Two things changed quickly.

First, switching locations forced a mental checkpoint. Walking from bedroom to living room is five steps that buy me two breaths. When I sit down, I actually ask: is this a five‑minute response or a full escalation? That alone shaves off frantic context switching.

Second, the laptop remained a tool, not a bedtime comfort toy. Before the rule, I would “just check logs” and drift into emails, PRs, and Slack threads. Out in the living room, those extra tabs feel more obviously optional. There's friction, and friction is sometimes what you need.

Practical small rules I added
These are the tiny things that made the boundary usable instead of performative:

- I prepared tiny runbooks (one page each) for the five most common alerts. They live in the on‑call bag and as a pinned note on my phone. If the first step fixes it, I don’t need the laptop.
- I made a “cold‑start” checklist for my laptop so I can boot, attach a VPN, and connect to the cluster in under five minutes. That checklist is laminated and in the bag.
- I told my team the new expectation: “If I'm on call and you DM me at night without escalations, assume I’ll respond after a short check.” This reduced the impulse to escalate trivial things.
- I optimized for quick, well‑scoped patches. If a fix required a long session, I documented steps, handed over to a teammate, and scheduled a morning follow‑up.

The week the rule broke (and what it taught me)
Two months after starting this, a storm took down our local transformer. No mains. My UPS kept the router alive for an hour, then it died. Mobile signals in my apartment block were weak because the nearest tower lost power. I had battery, but no reliable internet.

I did the sensible thing: I carried the laptop into the bedroom and tethered to my phone’s hotspot. Problem was, my phone’s hotspot throttled after 15 minutes and then the latency made any interactive debug a lottery. I ended up lying on the bed, laptop on my knees, furiously trying to replicate a bug I should have escalated earlier. By the time the issue was contained, I’d lost sleep, my back was sore, and worse — the root cause required a proper morning run and a teammate’s help. I had made everything worse by trying to own the whole thing from a compromised setup.

This failure taught me three real constraints:
1. Physical rules don't replace infrastructure resilience. Keep a backup connectivity plan (I now carry a prepaid 4G eSIM that costs me around ₹300 per month on rotation).
2. The bedroom boundary only works if you accept handing off. I didn’t hand off that week because I felt I could fix it faster. I couldn’t.
3. Quick fixes on poor networks are dangerous. If your fix is nontrivial, move the problem to a time when you have reliable connectivity and a teammate.

Tradeoffs you’ll actually feel
This is not a perfect system.

- Response times can be slightly longer. Sometimes the first-minute ping gets me only on the phone and I need to decide: fix now from a cramped mobile terminal, or wake up, go to the living room, and fix properly. I choose the latter more often than I expected.
- You need prework. The runbooks, laminated checklist, UPS, spare cables — that takes time and ₹4,000–₹6,000 in one‑time buys if you do it properly. It’s an upfront investment.
- Team norms matter. If your organisation expects immediate deep‑fixes at 2 a.m., a bedroom rule will get you written up unless you set expectations first.

What actually changed for me
Sleep improved. Not dramatically, but enough that I stopped resenting on‑call weeks. I became better at triage: three quick questions at the couch, then either fix in 15 minutes or escalate with clear context. I started logging intent in Slack: “Triage: did X, Y; will escalate to Z in 30m if not fixed.” That small habit removed the replay‑loop in my head.

I also learned to accept imperfect work at night. If a patch is not safe to land without review or a full CI run, it waits. That saved me from a few rollback mornings.

One takeaway
A physical boundary — a rule with friction you can feel — changed my on‑call behaviour more than another checklist ever did. But it isn’t a silver bullet. The boundary only works if you prepare for the times it will break: backup connectivity, a handoff plan, and the humility to say “I’ll take this in the morning.” That last one is the hardest and the most useful.