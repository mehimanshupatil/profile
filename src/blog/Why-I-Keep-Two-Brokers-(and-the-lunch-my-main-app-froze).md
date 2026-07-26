---
title: "Why I Keep Two Brokers (and the lunch my main app froze)"
pubDate: 2026-07-26
description: "I split my investments across two brokers as cheap insurance. When my main app froze during a volatile afternoon, the backup let me exit a ₹1.5‑lakh position. How I run two brokers without doubling my stress."
author: "Devika Iyer"
image:
  url: "https://images.unsplash.com/photo-1542224566-3c2b0b7c9a0d?w=1600&h=800&fit=crop&auto=format"
  alt: "Person holding a smartphone showing stock market charts next to a laptop on a wooden desk"
  caption: "Photo by Lukas Blazek on Unsplash"
  creditUrl: "https://unsplash.com/@lukasblazek"
tags: ["personal-finance", "investing", "india"]
---

It was 1:10 pm on a weekday. I was eating dal and rice at my desk between meetings, watching a small, concentrated position swing wildly. My Zerodha app — the one I use every day — showed a stalled order. Spinning wheel. No confirmation. No price. The market was moving fast and I could feel my stomach tighten.

I had a backup broker sitting unused on my phone: Groww. I opened it, placed a sell order, and it went through in 15 seconds. Money hit my account by evening (after T+2). The spinning wheel on the other app remained stubbornly indifferent for the next 40 minutes. I lost a bit on the trade overall, but the difference between being able to act and being frozen felt like the difference between panicking and staying in control.

That afternoon is why I keep two brokers. It’s not because I’m trying to optimize every basis point of brokerage. It’s because downtime, UI bugs, payment gateway failures, and occasional banking blocks happen. And when they do, money is the only thing that should not be captive.

How I split responsibilities between brokers
I treat the two brokers like a primary and an emergency lane.

- Primary broker: where most of my SIPs, long-term equities, and day-to-day monitoring live. For me that’s Zerodha — because I’m used to Kite, and the UPI mandates for SIPs are reliable.
- Secondary broker: minimal, active-use only; Groww turned out to work fine for quick trades during outages. I don’t auto-SIP here or leave parked orders; it’s there so I can act when the primary misbehaves.

I resisted a temptation many people have: duplicating everything just because it’s “nice to have.” Instead, I route recurring things into the primary. SIPs, ETF auto-invests, and high-frequency alerts stay there. The secondary is intentionally low-friction: one linked bank, saved UPI, and a handful of funds I’m comfortable buying or selling quickly.

Keeping records without doubling the headache
The honest tradeoff with two brokers is bookkeeping. If you don’t nail the tracking, your capital gains computation and mental model fragment.

I failed at this at first. I would buy small sums on the backup during outages and later forget them. At tax time I stared at three different contract notes and a spreadsheet that was half-finished. That year I paid more for filing help than I wanted.

So I built two small, guardrail habits that actually stuck:

- A single Google Sheet with two tabs: "Holdings" and "Trades." Every time I place a trade on the backup, I add a one-line entry before I forget. It takes 20 seconds.
- Monthly reconcile: on the 1st of each month I open both contract-note emails and cross-check totals. It’s boring but takes 12 minutes. If you use Zerodha + Groww, their CSVs are slightly different but the fields I need are the same: date, symbol, buy/sell, qty, price, brokerage, and net value.

This setup keeps my capital gains report sane and avoids a nasty surprise at FY-end. If you hate spreadsheets, a single paid capital-gains app that imports both contract notes will also do the job — but expect to pay ₹500–1,200/year.

Real costs and small annoyances
I want to be blunt about the tradeoffs. Two brokers mean:

- Slightly higher friction for intra-day optimization. I lose rebate consistency and sometimes pay two different brokerage structures depending on where I execute.
- Extra KYC and paperwork. I had to re-link my bank accounts and re-do UPI approvals. It took maybe two evenings.
- Mental overhead. There’s a tiny decision tax: which broker should I use? I solve it with a rule: primary for planned work, secondary for emergencies.

There’s a real financial cost, too. If you make many trades, the per-order fee differences matter. For me, most trades I perform on the backup are rare and large; the extra ₹20–40 in brokerage is insurance worth paying for.

A failure that taught me a non-obvious lesson
The backup isn’t magic. Once, during a bank‑level UPI block, both my brokers failed to debit for a quick buy I had planned. The lesson: if your bank’s UPI provider has an outage, two broker apps won’t help — both rely on the same rails.

After that, I added a tiny second layer of redundancy: a prepaid trading account balance. I keep ₹10,000–₹25,000 parked as a ready buffer in the secondary broker. It lets me buy when UPI is flaky, without depending on immediate bank hooks. That buffer gets rebalanced monthly.

When this approach is overkill
If you’re only doing one SIP and you never intraday trade, two brokers might be over-architecting. Two brokers add paperwork and split incentives. If your trades are infrequent and you value simplicity, stick to one trusted platform and learn its failure modes (app vs web vs phone orders).

But if your portfolio has concentrated positions, or you rely on being able to exit in a hurry, the “one broker is enough” assumption will bite you the day your app freezes.

A simple checklist if you want to try this
Open a second broker account. Link the same bank and confirm UPI. Place one small test trade and one test withdrawal. Save the contract-note email rule in your inbox. Keep a ₹10k buffer in the backup. Reconcile monthly.

I know this sounds like extra work. It is. But it converted one afternoon of helplessness into a small operational habit that stopped me from losing more money and, more importantly, from panicking.

Takeaway
Two brokers are cheap insurance for actions you might need in a hurry. The cost is paperwork and a 12‑minute monthly chore. For me — after the lunch my primary froze — that tradeoff is a no-brainer. My open question: what’s your failure mode? App freezes, bank UPI outages, or something else entirely? Knowing that will tell you exactly how much redundancy you actually need.