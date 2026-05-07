---
title: "The 2‑Hour Weekend Sprint That Finally Let My Side Project Breathe"
pubDate: 2026-05-07
description: "How I stopped scheduling all‑day Sunday hackathons and started shipping steady progress with two focused 2‑hour sprints each weekend — and the one tradeoff I didn't expect."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop and notebook on a wooden desk with a plant and coffee cup nearby"
  caption: "Photo by Green Chameleon on Unsplash"
  creditUrl: "https://unsplash.com/@greenchameleon"
tags: ["productivity", "side-projects", "time-management"]
---

The last time I tried a full‑day Sunday hackathon I burned out at 2 p.m., ordered biryani for dinner as a prize, and then didn’t touch the repo for two weeks.

It felt like progress in the moment — eight hours of deep work, a messy sprint through half a feature — but the next week I kept reopening the same three files because I’d overshot context depth and forgotten what I’d broken. The “block of time” approach let me binge, not build.

Two years of half-finished features, missed evenings with friends, and one irritated partner later, I switched to 2‑hour weekend sprints. Two hours, twice a weekend. No exceptions unless the city loses power or I'm at my sister’s wedding. It’s boring. It also worked.

Why two hours?
I had three constraints that made long sessions unworkable:
- I work full time (8–9 hours) and my head is already taxed by 9 p.m.
- Weekend households in India have chores: groceries, parents, plumber visits. Plans change fast.
- My focus span is finite. After 90 minutes I make worse decisions, not better ones.

Two hours is the smallest useful chunk where I can get into flow but not so long that life sneaks back in. Practically, here's how a sprint looks for me:

- 10 minutes: Setup and a tiny checklist
  - Pull main, switch to the feature branch.
  - Open the single ticket I’ll finish (no greening 5 things).
  - Start the dev server, run lightweight tests.
- 90 minutes: Focused work
  - No Slack, phone on DND, browser only for required docs.
  - I do the smallest meaningful vertical slice: UI, API, and one test.
- 20 minutes: Wrap and commit
  - Write an explicit commit message and a 2‑line summary in the ticket.
  - If it’s not shippable, note exact next steps. Then close the laptop.

The tiny checklist is the secret. It prevents me from spending 20 minutes reopening terminals or installing packages. I save that 20 minutes for the work I actually want to do.

Why it fixed my problem
1) Predictable context: Because each sprint has a single ticket, the cognitive overhead of re-entering the codebase collapsed. On average I spend less than 5 minutes re‑orienting instead of 25–40 minutes I used to lose.
2) Little wins feel real: Two hours is short enough to finish a microfeature, and finishing one thing reliably beats starting three and finishing none. That weekly track record reduces procrastination.
3) Low friction, high consistency: If I miss one sprint (a friend’s wedding, an outage), I don’t feel like I “blew a day.” I just show up next window. The psychology of “small committed time” beats the all‑or‑nothing trap.

A real example
I was building an expense‑splitter app for friends (UPI deep links, small server, and a React web UI). When I did marathon Sundays I had an ugly codebase: wiring half the payment flow on Sunday, then breaking it on Tuesday because I forgot a corner case. After switching to sprints, I shipped:
- 2 sprint weekends: UPI deep link flow + basic validation
- 4 sprint weekends: notifications and small reconciliation logic
- 3 sprint weekends: polish and deployment to a ₹300 VPS

It took longer in calendar weeks but I never felt the project “on fire.” It survived a two‑month job crunch and still shipped.

The tradeoff I didn't expect
The biggest downside: deep refactors suffer. A large refactor can legitimately need a 6‑hour uninterrupted stretch. My two‑hour sprints made me defer those until I could fully block out time, and I kept deprioritising them. That meant the codebase accumulated a few areas that would have been better fixed with a one‑off longer session.

My workaround: I reserve one Sunday morning per quarter for a marathon refactor. It’s a deliberate exception, scheduled like a paid meeting on my calendar, not an impromptu “let me try” session. It’s imperfect, but it contains the mess.

Practical rules that make this repeatable
- One ticket per sprint. If it can’t fit, split it.
- Always end with a testable output. If you can’t run something, your sprint failed.
- Keep dev infra warm. I have a small script that boots my docker containers in 20 seconds — saves precious minutes.
- Use a visible cue to start: I make a cup of tea, set a five‑minute timer, then open the repo. The ritual marks the boundary between weekend and work.
- Share the calendar with family. They know Saturday 10–12 is my “quiet slot.” It reduces interruptions in a small‑space Mumbai flat.

Where it still breaks
- Creative work like exploratory architecture or designing a complex UI sometimes needs longer. If I chunk those into two sprints, the first is setup and the second feels like a continuation, not closure.
- When office deadlines are brutal and I’m exhausted, 2 hours still feels impossible. In those weeks I scale down: 90 minutes once, or 60 minutes of “review & comments” instead of coding.

Why this is India‑friendly
In an Indian metro life, time is fragmented by errands, family, and unreliable utilities. Small, predictable windows are easier to protect than a full day. Also, mobile data or spotty Wi‑Fi makes long remote hack sessions painful at odd hours — two short bursts are easier to plan around a café with a backup hotspot or a neighbour’s generator.

One failure to admit
I tried to make this rigid. For three months I refused to work more than two hours even when a clear path to a major milestone emerged. I lost a momentum streak and ended up doing a 12‑hour catchup one long night, which was worse than my earlier Sunday binges. The rule isn’t a prison. It’s a default. Flex when it clearly benefits the project.

The takeaway I actually walked away with
Consistency beats intensity. Two focused hours, twice a weekend, can outpace sporadic marathon sessions — as long as you plan for the exceptions (big refactors, launches) and keep your infra warm. If your side project keeps dying on the altar of “I’ll finish it next Sunday,” try two hours this weekend. Ship one small thing. Repeat.