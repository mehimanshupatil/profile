---
title: "Why I keep a ₹300 test bank account for payment testing — and the week it got flagged"
pubDate: 2026-05-24
description: "I stopped pretending mocked payments were enough. I run a dedicated ₹300 bank account for integration testing — how I set it up, the rules, and the time the bank froze it."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&h=800&fit=crop&auto=format"
  alt: "A person holding a smartphone showing a payment app, laptop keyboard in the background"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["payments", "testing", "developer-tools"]
---

It was 1:17 a.m. when my phone buzzed: our staging webhook queue had exploded. Customers on staging were getting weird payment statuses—success for failed flows, refunds for payments that never happened. I sipped my third coffee and scanned logs: every payment attempt from our test suite was hitting an actual bank endpoint and returning races of real UPI callbacks we hadn’t expected.

We had mocks for the payment gateway, a local ReplayProxy for webhooks, and a "fake" UPI handle in test config. That should have been enough. Except it wasn’t. We were accidentally using a real bank account in one environment. That one mistake is why, two weeks later, I opened a tiny savings account with ₹300 and turned it into our canonical payment test account.

Why a real account beats mocks (most of the time)
Mocks are great for unit tests. They’re fast, deterministic, and don’t require a bank. But real integrations fail in ways mocks won’t reproduce:

- NPCI routing quirks: some banks return slightly different settlement IDs or reverse the callback payload order. Mocks don’t.
- Bank-specific latency and idempotency behaviour: the gateway retries, bank deduplicates, and you get duplicate webhooks. Our retry logic only showed up against a real bank.
- Third-party anti-fraud heuristics: sudden patterns of IMPS/NEFT from the same account, even at small volumes, trigger holds. Mocks never do that.

After the midnight incident, I realized the cost of “not testing with money” was real outages and weird edge cases. The solution needed to be cheap, low-friction, and — importantly — auditable. A ₹300 savings account fit that brief.

How I set it up — boring, repeatable rules
I did two things that made the account useful and safe.

1) Keep it tiny and separate
I opened a normal savings account with a regional bank branch that had decent internet banking and UPI support. Initial deposit: ₹300. No other salary or transfers go there. The account name is "Company Test — Payments". This reduces the chance of the account becoming someone's personal fallback.

2) A strict three-rule policy (enforced in CI)
- Read-only credentials in staging: no transaction keys, just webhook receipts. Staging can only read status via the gateway.
- Write-only in a controlled pipeline: our test-runner (a single Jenkins job) gets a short-lived API key and can create transactions up to ₹200 per run.
- Manual recovery step for anything outside CI: if the account balance ever dips below ₹50 or over ₹5,000 in a day, the ops lead gets paged and we pause payment tests.

These rules are enforced by a tiny wrapper script we call paytestctl. It rotates API keys with a short TTL, signs all transactions, and writes a human-readable audit line to our repository (commit + timestamp) whenever tests touch the account.

The week it got flagged (and why I still think it was worth it)
Two months in, we had reliable coverage, fewer production surprises, and better confidence. Then the bank froze the account.

What happened:
- We increased test parallelism for a load test and accidentally sent 60 IMPS-like transactions in a short span (₹20–₹50 each).
- The bank's anti-fraud system flagged the pattern as "unusual activity" and froze debits until a branch-level KYC check.
- Because the account had a corporate-sounding name but was a personal savings account, the churn created extra paperwork. I had to visit the branch during a weekday, present ID, and convince the manager this was a benign test account.

Consequences:
- Our CI tests that relied on that account failed for 48 hours.
- The ops lead spent a day doing manual reconciliations.
- I learned we needed explicit rate limits and an escalation playbook.

What I changed after the freeze
- Rate limits hard-coded into paytestctl (max 25 transactions/hour).
- Automatic fallback to recorded webhook replays if the account is unavailable, with a one-line alert explaining why the fallback was used.
- A "branch visit checklist" in our runbook listing the documents needed to unfreeze the account and the exact contact at the bank branch.

The honest tradeoffs
This setup isn’t free of problems.

- Compliance and KYC: even a tiny account brought paperwork. If you’re at a company that processes KYC-sensitive flows, you’ll need legal sign-off.
- Not production identical: it’s still a small account on a retail bank; it won’t surface issues only visible on corporate accounts or at very large volumes.
- Maintenance: you need someone who knows the account exists. We added it to our on-call playbook. If that person leaves, the account becomes a problem (we almost burned that bridge during one hiring gap).

Why I recommend this to small startups in India
If you’re shipping payments in a small team — and you’re tired of payment bugs that show up only in production — a low-cost, dedicated test account is the fastest way to reduce surprises. For roughly the time it takes to open a branch account (and ₹300), you get reproducible failures, realistic webhook shapes, and clarity on idempotency and retry behaviour.

A few practical tips before you do it
- Use a bank branch you can walk into. Phone support won’t cut it for a frozen account.
- Log every test transaction with a human-readable commit reference. If the bank asks "what is this?", your ops lead can send a single email.
- Treat the account as infra. Put it in your runbook, rotate keys, and add it to on-call handover notes.

Takeaway
Mocks are necessary; a tiny real account fills the gaps mocks miss. Be ready for paperwork and the occasional freeze. The win: fewer midnight surprises and payment behaviour you can actually trust. My open question for teams doing this: what’s the cleanest way to combine recorded real transactions with live testing so you get coverage without baking in bank risk? I’d rather hear a smart, practical solution than another theoretical pattern.