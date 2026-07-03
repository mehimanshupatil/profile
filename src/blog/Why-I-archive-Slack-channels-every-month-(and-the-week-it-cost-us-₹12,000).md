---
title: "Why I archive Slack channels every month (and the week it cost us ₹12,000)"
pubDate: 2026-07-03
description: "A simple monthly Slack‑curation ritual I use to stop losing context, with the exact steps, one costly mistake, and the tradeoffs that made it worth doing."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk beside a coffee cup and an open notebook"
  caption: "Photo by Chris Montgomery on Unsplash"
  creditUrl: "https://unsplash.com/@chrismontgomery"
tags: ["productivity", "team-culture", "tools"]
---

It was Thursday, 6:10 PM, and I was doing the thing every engineer hates: digging through six months of Slack for a vendor's bank details. Payroll was closing. The vendor's milestone was ₹12,000. Payroll ops needed that UPI ID now. The channel had been noisy, then quiet, then renamed, then archived—by someone else—sometime last quarter. I spent 25 minutes unarchiving, hunting, and finally paying a late fee. I walked home thinking: this was avoidable.

Our Slack at the startup was a graveyard and a bazaar at the same time: feature discussion channels, temp incident channels, a dozen “#project-xyz-qa”s created for a sprint, and a slew of DMs holding decision crumbs. The cognitive overhead of remembering which channel had the final decision was constant. Simple searches returned too many false positives. I started a monthly habit: a 20‑minute Slack curation ritual. It made my work quieter. But it also bit us that week—hard enough to make me change how I do it.

Why I started archiving monthly

I tried the usual band‑aids: pinned messages, a Notion “decisions” page, naming conventions. They helped a bit. But the accumulation kept outpacing discipline. The insight that finally stuck was: the problem wasn't Slack's search or pins; it was signal dilution. Active channels should be a small, current set. Old channels should be intentionally archived and either summarized or copied into a durable place.

The ritual (20 minutes, once a month)

I do this at 4 PM on the last Friday of the month. Parts are personal; parts require help from whoever runs Slack admin at your company.

1) Quick scan (5 minutes)
- Open the channel list. Anything with no messages in 30 days gets a quick "stale" tag in my head.
- If a channel hasn't had an actionable message in 90 days, it's a candidate to archive.

2) Three-line summary (7 minutes)
- For each candidate channel I care about, I copy the crucial parts into our Notion Decisions page: one line for the decision/outcome, one line for owners (who to ping), one link to an exemplar message (if needed).
- If there are attachments or vendor details, I move them to a dedicated, access-controlled Google Drive folder and paste the Drive link in the Notion note.

3) Archive with intent (5 minutes)
- Rename the channel if it helps ("project-abc-archive-2026-06") and then archive it. The rename makes the archive searchable and explains the reason at a glance.
- If the channel contains ongoing automation (incoming webhooks, CI logs), I move the integration first. This is where people trip up.

4) Fast unarchive path (3 minutes)
- Document a one‑click unarchive process in the team-run playbook (who can unarchive, expected turnaround time). For our org that meant ensuring two managers had admin rights and one on-call person knew the process.

The week it failed: what I missed

When payroll went wrong, I did archive the vendor channel three months earlier after summarizing account details in Notion. But I made two mistakes that compounded:

- I didn’t copy the vendor’s live UPI screenshot to Drive because I thought the Notion summary was enough. Notion text wasn’t pre-verified for payments.
- I archived the channel where the vendor kept an updated invoice webhook. The webhook remained active, and our finance bot pulled the wrong latest invoice from another thread. Because only admins could unarchive channels that affected integrations, and both admins were out, getting the archived channel back took 40 minutes—long enough to miss the payroll cutoff and incur a ₹12,000 late payment.

That week taught me the parts that need extra care: payments, legal attachments, and anything tied to an automation cannot be treated as normal stale content. They need a migration checklist, not just a three‑line summary.

Tradeoffs (and why I still do it)

Archiving monthly isn’t magic. Here's what I traded and accepted:

- Discoverability vs. mental clarity: Searching archived channels still works, but it's slower. I accepted a small time cost later for a big mental cost reduction now — fewer accidental notifications, fewer false search hits.
- Integrations require process: We had to invest time to audit webhooks and bots. That sucked initially and is ongoing work. But the alternative was fragile automation and missed notices.
- Admin dependency: The unarchive delay is real if your org is flat and admins are scarce. We solved some of this by giving one engineer temporary unarchive rights for payroll week, at the cost of slightly looser controls.

How the team handled the mistake

After the payroll incident I pushed two changes that made the ritual safer:

- A "payments" policy: anything involving money gets a required Drive backup of invoice/UPI and a "payments" label in Notion. No exceptions.
- A monthly curation owner: rotating responsibility so there’s always a named person who runs the 20‑minute sweep and knows where fragile automations live.

The surprising win

The first month my inbox and notifications felt calmer. Meeting prep got easier because I wasn't trying to remember "which channel had that decision?" I saved real time in context switching — not because I could find messages faster, but because there were fewer places I had to check for the authoritative answer.

One honest limitation

If your org is a thousand people and channels are noisy because hundreds of teams post infra data, this ritual won't scale the same way. You need Slack governance (naming, channel lifecycle policy) from the top. My approach works for teams of ~10–200 where individuals can reasonably own a curation habit.

What I walk away with

Curating Slack monthly turned an accidental archive into a conscious knowledge flow. The ₹12,000 mistake was expensive and avoidable. The real payoff wasn't money saved; it was fewer afternoons spent in the search hole, and a shared expectation that our conversations don't quietly become permanent trash.

Try one sweep this month: 20 minutes, rename then archive, and move anything money‑sensitive to a proper folder. If you break one thing, document why. That's the point—break it intentionally, once, and make fixes permanent.