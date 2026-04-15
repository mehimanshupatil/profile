---
title: "The ₹2,500 Test Phone I Carry for Payment Bugs (and the mess it caught in 3 weeks)"
pubDate: 2026-04-15
description: "I bought a cheap second-hand Android as a dedicated payment test device. Here’s exactly how I set it up, the bugs it found, and the maintenance tradeoffs that almost made me sell it."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1505740106531-4243f3831f2f?w=1600&h=800&fit=crop&auto=format"
  alt: "Close-up of a person holding a smartphone over a wooden table with a cup of coffee"
  caption: "Photo by Florencia Viadana on Unsplash"
  creditUrl: "https://unsplash.com/@floviadana"
tags: ["payments", "mobile-testing", "developer-tools", "india"]
---

We were demoing a new checkout flow to a payments partner at 11:30 PM. The screen showed a UPI popup. The demo user (me) tapped "Confirm", the spinner stayed, and the partner's dashboard reported "payment initiated" while our UI never updated. No logs showed failure. The partner’s CSRs insisted the money wasn't debited; our payments engineer said their sandbox returned OK. The client left disappointed. I hated that disappearance — the gap between "works on my device" and "broken in the wild."

That night I ordered a second‑hand Android off a local marketplace for ₹2,500. I told myself it was a small experiment. It turned into the single most reliable thing I use to reproduce the strangest UPI/card/device-state bugs.

Why a physical phone — not an emulator, not a virtual device, not another profile on my dev phone? Because payments depend on hardware states: SIM registration quirks, app install provenance, Play Services version, camera access for QR, exact TLS stacks, vendor NFC drivers, and the way banks mark devices as "new." Emulators miss all those.

Why buy cheap: I didn't need flagship radios or shiny UX. I needed something as close to a customer device as possible that I could treat like a lab rat—factory reset, re-root, install weird builds, or hand to QA without risking my personal number.

What I installed and why
- A clean build of Android (stock if possible). No Play Protect weirdness. If the vendor OS is flaky, that’s a useful data point.
- The payment apps we support: BHIM, Google Pay, PhonePe, a couple of bank apps (ICICI, SBI), and a simulated merchant app build. I keep real, non-production accounts active on this phone for realistic flows.
- Island (work profile) to run isolated builds alongside Play apps, or just separate user accounts. This avoids account pollution.
- A minimal set of debugging tools: ADB enabled, logcat rotation script, an always-on tiny HTTP logger (ngrok was too flaky on slow home internet), and a screenshot-on-failure script that triggers via ADB when an app crashes.
- A prepaid SIM with a low-cost 4G plan (₹299/month) that I top up only when I test network edge cases. I keep a second SIM for banks that block transfers without KYC or when a specific issuer requires a number.

Three real bugs the device found
1) The "ghost payment" during demos
On the cheap phone, using a particular bank app behind a restricted NAT, I reproduced the exact state: bank server returned success after a delayed re-try while our app timed out and retried — two transfers. The partner's sandbox had no throttling. Only the real SIM on that device hit the path where the bank retried and the checksum changed. We added idempotency on the client side and a safer confirmation UI. That would never have shown up on my dev emulator.

2) QR scanning that worked for 90% of users, failed for one bank
The phone's autofocus behaved slightly differently than newer phones. On this device, the QR frame rate dropped and the camera feed missed a partial frame, which made one bank's QR URL parser reject the payload. Emulators and my Pixel never reproduced it. Fix: widen the QR packaging tolerance and add a client-side pre-parse that tolerates dropped bytes.

3) Play Services version edge case
A vendor-supplied firmware had an older Play Services that broke token refresh for card tokenization in a specific bank flow. The card token appeared created but the tokenization callback never returned. This was only visible on devices with that vendor blob. We added runtime checks and a fallback path. This bug cost a partner integration until we caught it on the test phone.

Maintenance and real tradeoffs
This thing is not “set and forget.” The honest failures:

- Battery life and charging: The cheap battery drains fast. I once left it unplugged overnight before a test fleet run; the device died mid-play and I lost logs. I now keep a ₹600 two‑pin fast charger beside it and a charging reminder in my calendar.

- Network radios lie: Cheap radios show 4G but drop packet streams under congestion. That helped find some bugs, but also caused false positives where the bug was "shoddy radio" not our code. You have to separate radio reliability from app logic. I now test twice: once on the cheap phone, then on a mid-range device.

- KYC and real money: Using real bank accounts on a test device is messy in India. UPI limits, KYC blocks, and bank anti‑fraud can lock numbers. The first month I had my test SIM blocked once after a handful of small transfers. I warmed the account with small payments and kept identification handy. If you're on a corporate project, get a vendor test account or explicit permission; otherwise use sandbox flows for higher-risk tests.

- App updates and provenance: Some bugs only existed because the app was side-loaded or installed from a mirror. One time I accidentally left an old APK on the device; tests started failing in different ways. My rule now: keep an "image" script that reinstalls the exact builds I mean to test.

- Logs are harder to capture: You can't rely on full remote crash reports for device-specific issues. I use ADB over Wi‑Fi and a small script that pushes logcat to our server after each test. When network is poor, I physically pull logs with USB.

How I use it day-to-day
- Before any live integration demo, I run a quick checklist on the test phone: fresh app, correct SIM, battery > 80%, network toggle (Wi‑Fi off/on), and ADB connected. If the partner's environment is unpredictable, I demo on the test phone first.
- For new banks or vendors, I run a script that runs the happy path 20 times and captures failures. This often surfaces flaky retries or non‑idempotent operations.
- I hand it to QA for random exploratory testing. They break it faster than I do.

One constraint that shaped how I use it
I live in a rented flat in Bengaluru with unreliable evenings of internet. I can't keep a static external IP, and my home router occasionally blocks ADB-over-Wi‑Fi. That made me lean heavily on USB log pulls and a cheap ₹300 VPS with Tailscale for relaying logs. If you have stable office infra, you can skip that step. For me, this constraint forced a repeatable, low-dependency workflow.

What I walked away with
If you integrate payments in India, one small, replaceable, disposable phone will find the kinds of real-world failures emulators and labs miss. Expect maintenance, expect false positives, and budget time to tame the radios and KYC pain. The real win is confidence: demos don’t end with awkward silence anymore. That alone made ₹2,500 and a little annoyance worth it.