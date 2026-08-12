---
title: "A tiny chaos proxy that made our payment flow stop failing on flaky Indian networks"
pubDate: 2026-08-12
description: "I built a small local HTTP proxy to inject latency, packet loss and intermittent errors into mobile app traffic. How I set it up, when it helped, and where it failed."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1600&h=800&fit=crop&auto=format"
  alt: "Workspace with a laptop, smartphone, and coffee cup on a wooden table"
  caption: "Photo by Glenn Carstens-Peters on Unsplash"
  creditUrl: "https://unsplash.com/@glenncarstenspeters"
tags: ["network-testing", "mobile", "developer-tools"]
---

It was 11:30 a.m., two days before a client demo, and the payments flow on my Android build kept timing out on real devices. On the emulator everything was perfect. On phones it failed half the time—always when the office Wi‑Fi hiccuped, always during the one minute my product manager was watching.

We had seen flaky mobile networks in India before: variable latency in apartment-complex Wi‑Fi, carrier handoffs, bursty 4G with DNS timeouts. But these failures were never reproducible on my laptop, so they never made it into ticket triage. That afternoon I decided to stop guessing and make the network misbehave on demand.

What I needed was simple: a tiny local proxy that would stand between the app and my backend and inject realistic network noise—latency spikes, dropped responses, intermittent 5xxs and DNS-like failures. It had to work with real phones, require zero infra changes, and be fast to flip on and off.

Why a proxy and not a simulator
I toyed with device emulators and network-shaping tools (tc/netem) for a bit. Those work if the phone traffic routes through your machine as a network interface, but they’re awkward on real Android phones without root, and our testing often used physical phones for UPI flows and intent-based deep links. A local HTTP proxy is a small, language-agnostic shim. Point the phone at it, and you can mutate requests and responses without changing the app or backend.

How I built it (in 200 lines of Node)
I wrote a small proxy using node-http-proxy and two tiny additions:

- A rules JSON that lists hosts and behaviours (latency distribution, failure probability, response code to inject).
- A seeded RNG so I could reproduce a scenario.

Crucial bit: adb reverse for Android. On a physical phone connected over USB I ran:

adb reverse tcp:8888 tcp:8888

Then I set the app's base URL to http://10.0.2.2:8888 (or used a debug build that reads a HOST env). For phones on a Wi‑Fi hotspot, I created a hotspot from my laptop and set the phone’s Wi‑Fi proxy to my laptop IP:8888. When office Wi‑Fi blocks proxy settings, a cheap travel router (₹1,200) works as a workaround—you own the hotspot and the proxy behavior.

A tiny example rule (rules.json)
{
  "api.myapp.com": {
    "latencyMs": { "p50": 100, "p95": 800 },
    "dropProbability": 0.08,
    "errorProbability": 0.06,
    "errorStatus": 502
  }
}

The proxy reads the rule and decides: delay the response by sampling latency, occasionally close the socket mid-response to simulate a drop, or return a 502 without forwarding. Because it’s local, I could iterate: change p95 to 1500, run a payment, see the UI spinner behavior, fix a retry bug, run again.

Where it helped
The proxy found three classes of bugs in a week:

- retry policy mistakes: we retried non-idempotent POSTs instead of doing an idempotency-key retry, causing duplicate orders on flaky networks.
- UI timeouts: our spinner logic canceled the network call after 7s but left the button enabled, letting users fire duplicate requests during a retry window.
- DNS-like behavior: occasional early TCP resets were treated as permanent server errors by our Android HTTP client; adding a short jittered retry fixed many failures.

We shipped fixes that cut reported payment failures on real devices by roughly half in the next sprint. The demo went fine.

The part I screwed up
I’ll be blunt: I left chaos rules enabled in a staging build once. A QA team member, on the same network, assumed staging was healthy and did end‑to‑end tests. We started seeing intermittent 502s and escalating alarms. It took a frantic 30 minutes to realize my laptop proxy (which I run nightly for personal experiments) had a wildcard rule and the QA tunnel was routing through it. The root cause was bad defaults and a noisy global hostname matcher.

After that I made two rules mandatory: explicit allowed‑hosts and an HMAC token in a custom proxy header so only debug builds can be routed. Also, never run the proxy as a background service on a team machine.

The tradeoffs you should expect
This approach is pragmatic, not perfect. It mutates HTTP semantics—good for surface-level retry/UI bugs but lousy for lower‑level TCP retransmission issues, cellular carrier NAT behaviour, or TLS handshake quirks. It won’t replicate a carrier's intermittent DNS hijacks or an ISP's captive portal, and it sometimes made tests flaky because randomness without deterministic seeds creates non‑reproducible failures.

So I added:

- deterministic scenarios (seeded runs you can share in a bug).
- a “record” mode that logs timings of real-world failures so you can replay them later.
- an opt‑out header that forces the proxy to pass through untouched (useful for CI).

A couple of operational notes for Indian devs
If you test on many devices and don’t want to set Wi‑Fi proxy per phone every time, adb reverse is a lifesaver for USB-connected phones. If your office Wi‑Fi blocks proxying or requires authentication, use a simple ₹1,200 travel router to create a controlled hotspot. Keep an eye on corporate VPNs and captive portals; they can silently route traffic around your proxy.

What I walked away with
You can’t fix what you can’t reproduce. Making the network noisy on demand turned a handful of impossible bugs into clear engineering tasks. But noise needs boundaries: deterministic scenarios, safety switches, and team awareness. The real win wasn’t the proxy itself— it was the mental model it enforced: assume the network will fail in weird ways, design idempotency and retries accordingly, and test those failures before your demo.

I still don’t simulate every carrier quirk. I do, however, flip a single file (rules.json) before every release test. That one habit has saved me more late‑night triage than any logging library.