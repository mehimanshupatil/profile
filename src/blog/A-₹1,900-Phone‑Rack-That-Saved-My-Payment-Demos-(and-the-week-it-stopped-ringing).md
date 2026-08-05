---
title: "A ₹1,900 Phone‑Rack That Saved My Payment Demos (and the week it stopped ringing)"
pubDate: 2026-08-05
description: "How I built a cheap, maintainable rack of old Android phones for UPI/card testing—what I buy, how I run it, and the one failure that taught me where it can't replace real users."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=1600&h=800&fit=crop&auto=format"
  alt: "Several smartphones laid out on a wooden table with charging cables connected"
  caption: "Photo by Jonas Leupe on Unsplash"
  creditUrl: "https://unsplash.com/@jonasleupe"
tags: ["mobile-testing", "payments", "dev-tools"]
---

The demo started fine. Browser UI looked perfect. I sent the payment link. The customer's phone showed a spinning UPI spinner for thirty seconds, then a toast: “Transaction failed.” On my side, logs said everything was successful. On the call, the customer was annoyed. I had no way to reproduce the exact handset+SIM environment they were on.

That was the worst kind of bug: works in staging, fails in the wild. After three nights of chasing flaky callbacks and driver versions, I built a cheap physical test rack from things I already had. It cost ₹1,900 out-of-pocket and stopped me losing demos. It also forced me to accept that hardware testing requires discipline.

Why build a phone rack

Emulators are great. Browser payments are fine. But real UPI/card flows depend on:
- real SIM carriers (Airtel vs Jio vs Vodafone), with different networks and NATs,
- real bank apps/UPI stacks on different Android versions,
- notifications and intents that only trigger on device,
- the user's physical interaction (fingerprint, lockscreen, app pickups).

A single desktop or one test phone wasn't cutting it. I needed multiple real devices I could control remotely, keep charged, and swap into tests fast. The constraints: low budget (I’m an individual contributor with a ₹30,000-ish monthly gadget budget I don't want to blow), unreliable office internet, and no appetite for a massive maintenance burden.

What I actually built (and how much it cost)

I list exact parts because the alchemy matters. I used refurbished/old devices—no new phones.

- 4 old Android phones (mine + colleagues’ 2 phones + one refurbished): free–₹2,500 (I already had all but one; if you buy, plan ₹2,000–₹4,000)
- 7‑port powered USB hub (for charging + adb): ₹1,000
- Short USB‑A to micro/USB‑C cables (x4): ₹200
- A cheap cardboard shelf to keep phones tidy: ₹100
- A ₹500 prepaid SIM split across providers (two SIMs, cheap recharge plans)

Total I spent directly: ~₹1,900 (assuming one refurb). If you need to buy all phones it’s obviously more.

How I run it

The point is reproducible, fast testing—not building a production lab.

- Label everything. Phone0..Phone3 on stickers. One SIM per phone, and list carrier and app versions in a tiny CSV.
- Keep adb over TCP on a local laptop. I enable "adb tcpip 5555" once per phone and connect over the office LAN (or my home AP). That avoids swapping cables constantly.
- Use scrcpy to mirror screens when I need to watch or interact. Commands are trivial: scrcpy --serial 192.168.1.10:5555
- For automated triggers I use simple adb shell input tap/keyevent scripts and a small Node.js harness that calls intents and waits for callback endpoints.
- A cheap power strip and the powered hub keep phones on charge 24/7. I reboot each device every Sunday automatically via adb to avoid memory leaks.

Small scripts I use (literal, because you asked for practical):
- quick-connect.sh (maps a phone's label to its IP and runs scrcpy)
- run-payment-test.js (pushes an intent to the UPI app, waits for a webhook)

Why this stopped most demo surprises

- Real notifications: Some UPI callbacks only surface when the bank app receives a push; emulator push reliability is poor.
- Carrier quirks: Jio on my test phone NATted differently and reproduced a 502 timeout I never saw on my office Wi‑Fi.
- Fingerprinting: Android WebView variations on older phones changed how the payment SDK injected the callback URL; I found this within hours.

The honest tradeoff: maintenance and an ugly failure

This is not glorified automation. The rack needs babysitting.

Two months in something annoying happened: a bank started blacklisting quick repeated test transactions from the same device IMEI/SIM pattern. One evening, during a client demo, all test payments silently failed because the bank's fraud system flagged our lab. I had over-optimized for reproducibility and under-rotated identities. The fix was painful: add randomized device headers, rotate SIMs monthly, and accept a small monthly SIM recharge cost (₹300–₹500).

Other ongoing pains:
- Phones die: batteries swell or die; keep spares.
- App updates: automatic Play Store updates can change flows. I disable auto-updates and update phones intentionally after a test cycle.
- Privacy: these phones have real accounts. Keep test accounts locked down and scrub sensitive data.
- Time: initial setup took me three evenings. Weekly maintenance is ~20 minutes.

When the rack lied to me

The worst lesson was thinking this rack would replace user testing. It doesn't. There are payment edge cases tied to real user sessions: bank OTPs sent to alternate numbers, RBI 2FA flows, or carrier-level throttles during festivals. The rack helps reproduce and triage about 80% of deterministic issues. It won't catch random human behaviour or intermittent carrier outages on Diwali.

One small process that made maintenance tolerable

I adopted a one-line health check that runs on my laptop at 9am: it pings all phones, checks if the UPI app process is running, and performs a dry “intent” that reaches our dev webhook. If anything fails, Slack pings me and I reboot or swap devices. That 10‑second routine saved two client calls.

Final takeaway

If you demo payments to customers in India, having a small, cheap bank of real phones is an investment that pays back fast—₹1,000–₹3,000 and a few evenings of work will save you the embarrassment of a failed live demo. But don’t pretend it replaces real user testing. Expect maintenance, rotate SIMs, and treat the rack as a reproducibility tool, not a validity oracle.

I still keep one phone for cold demos (the cleanest state) and one for exploratory breaks where I try new banks or carriers. It’s enough to stop most fires. The question I keep asking myself now: how much automation should I add before the lab becomes a second on‑call? I haven't solved that yet, and probably never will.