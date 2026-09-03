---
title: "The tiny local rate‑limit proxy that found our payment throttling"
pubDate: 2026-09-03
description: "How I built a small local proxy to simulate third‑party rate limits for payment flows, the bug it caught, and the false confidence I had to unlearn."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with code on the screen and a smartphone nearby"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["devtools", "payments", "infra"]
---

It was 10:30 p.m. and a client on our payments team had just messaged: "We missed three payouts in the last hour — gateway returning 429s." My laptop was open, my dinner cold, and the staging environment looked fine. In production, the payment gateway had started throttling us in a way our test harness never reproduced.

We spend a lot of time mocking happy paths. We don’t spend enough time mocking being told "slow down". That night I built a tiny local proxy to do exactly that: pretend the third‑party API was fed up and start returning 429s, with the patterns and backoff I needed to debug our retry and billing code.

What I built (in ten minutes)
- A small Go program (about 120 lines) that sat between our app and the real gateway. It rewrote the host header, forwarded requests, but maintained a token‑bucket per "client key" and returned 429 when the bucket was empty.
- Config was one JSON file: endpoints to proxy, token‑bucket rate (requests/sec), burst, and a few deterministic failure patterns (e.g., consecutive 429s, spikes).
- I ran it locally and pointed my dev env via /etc/hosts to 127.0.0.1. No VPN, no remote VPS, no fiddly DNS changes.

Why this was useful immediately
- Repro vs. conjecture: the production 429s were intermittent. With the proxy I could reproduce exact 429 bursts on demand and watch how our retry logic interacted with them.
- Fast iteration: I could tweak burst sizes and backoff from my laptop, reproduce a sequence, and trace logs without waiting for the gateway to misbehave again.
- Low friction for teammates: I committed the tiny JSON config with patterns to the repo. A junior could run the proxy, flip a switch, and see the failing scenario in 30 seconds.

An example that mattered
One flow was critical: a reconciliation job that retried failed payouts. Locally, with a 3‑retry policy and exponential backoff, it looked fine. But when I forced a specific pattern — ten quick 429s followed by success — our job retried, then recorded the failure as permanent because of a subtle bug in how we mapped 429 vs 500. The proxy showed the exact interleaving of events that caused the race and let me produce a failing test. We fixed the mapping, pushed a patch, and the next night production 429s stopped causing missed payouts.

The things the proxy didn't catch (my honest failure)
After the fix, I slept better. Until a week later, when the gateway started throttling us again. Same error class. Only this time the proxy tests suggested we were fine, but production still broke.

Root cause: the gateway’s rate limits weren’t per‑client key or per‑IP. They were global and influenced by a mix of merchant id and merchant subaccounts hitting the same quota on the vendor side. My proxy simulated per‑client token buckets keyed to the API key header — which made it a useful tool, but a poor model for that vendor’s global policy. I had traded speed for fidelity. I had a false sense of confidence.

How I patched the patch
- I extended the proxy to support different scoping rules: per‑IP, per‑API‑key, and a "global" bucket. That change revealed scenarios where our retry logic would thrash multiple long‑running payout jobs and amplify the problem.
- I added a "stochastic storm" mode: random spikes and correlated 429s across endpoints to mirror the real world where multiple services and backfills run at once — especially around month‑end salary cycles when our payroll customers spike.
- I kept the tiny JSON configs in the repo and documented which vendor needed which mode. Now when someone files a "429" bug, the first triage step is "run proxy with <vendor> pattern."

Tradeoffs I accepted
- Complexity vs speed: the initial proxy was intentionally simple so anyone could run it. Adding global buckets and stochastic modes made it more realistic but also more configuration to maintain.
- False negatives still happen: no local simulator equals the vendor’s production. I accepted that the simulator would never fully replace a scheduled integration test against the real gateway. So I added a single nightly smoke test against the real vendor (on a ₹300 test account) to validate my assumptions.
- Maintenance: every time a vendor changed rate‑limit headers or policy, the proxy needed tweaks. I treated it like a small test repo with an owner, not an invisible infra hack.

Why this is particularly useful in India
Payment flows in India (UPI, netbanking, card gateways) are noisy. A single merchant event (salary day, cashback promo on a payments app) can create correlated load. Mobile networks and slow bank callbacks make timing assumptions fragile. A cheap local proxy means you can reproduce a "gateway unhappy" story without burning API quotas, without waiting for bank batches, and without juggling multiple test bank accounts or costly per‑request fees.

Practical snippet (what I actually ran)
- Go proxy binary (GPL‑free code in a tiny repo): runs on :8080
- JSON config checked into repo: {"vendor":"Razorpay","scope":"global","rate":5,"burst":10,"patterns":[{"type":"spike","count":10,"interval_ms":200}]}
- /etc/hosts entry in a dev makefile: echo "127.0.0.1 api.vendor.com" | sudo tee -a /etc/hosts
- A ₹300 test VPA and ₹300 prepaid test card for a nightly verification job (so we don't depend on staging)

Takeaway
A tiny, local rate‑limit proxy is cheap to build and gives you a powerful, repeatable way to test throttling and retry behavior. But don't trust it blindly. Start simple, add modes that reflect how your vendor actually scopes rate limits, and pair it with at least one low‑cost real integration test. The proxy finds classes of bugs you won't otherwise see — and it also makes you painfully aware of the limits of your models. That's good. It keeps you debugging in production less often.