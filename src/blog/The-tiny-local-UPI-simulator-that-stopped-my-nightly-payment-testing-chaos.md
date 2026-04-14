---
title: "The tiny local UPI simulator that stopped my nightly payment-testing chaos"
pubDate: 2026-04-14
description: "I built a lightweight local UPI/payment simulator to run reliable end‑to‑end tests on my emulator and phone without using staging or burning mobile data. Here's what I actually built, why it worked, and where it failed."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Laptop on a wooden desk showing code editor on screen, with a coffee cup and phone nearby"
  caption: "Photo by Annie Spratt on Unsplash"
  creditUrl: "https://unsplash.com/@anniespratt"
tags: ["payments", "developer-tools", "india"]
---

It was 10:40pm and I was demoing a UPI payment flow to my PM over a flaky home Wi‑Fi connection. The Android emulator kept timing out waiting for a PSP callback; the app showed “pending” because our staging bank had queued the message. I wasted twenty minutes trying to coax a test transaction through, then restarted the emulator, and restarted my laptop, and finally gave up.

That was the night I decided “staging” and “real PSPs” were not the right tool for the hundred little developer iterations I do every week. I needed a tiny, local thing that behaved like a payment backend: predictable, fast, and usable offline so I could iterate without burning mobile data or waiting for bank queues.

What I built (in 3 evenings)
- A small HTTP server (node/express, ~250 lines) that implements the minimal subset of endpoints my app expects:
  - /initiate — returns a mock transaction id and a payload identical to the PSP’s init response
  - /status/:txid — returns deterministic state (success, pending, failed)
  - /callback — an endpoint the simulator uses to post back a final status to my app’s callback URL
- A tiny CLI to trigger state transitions (simulate success/failure/refund) so QA or I can flip a result immediately
- Adapters to emulate a couple of PSP quirks: extra headers, slightly different JSON shapes for Razorpay vs a generic bank
- Instructions to route emulator/device traffic to my laptop without DNS or internet: adb reverse for a physical device, 10.0.2.2 for the Android emulator; /etc/hosts entries for desktop web tests

Why this is boringly useful
- Speed: Starting the simulator and running a transaction takes ~1 second. No bank queues, no waiting for settlement windows. That’s tens of minutes saved per session.
- No data burn: I run everything over my laptop + emulator; my ₹399 mobile plan doesn’t see these test runs.
- Determinism: The simulator returns consistent transaction IDs and predictable callbacks so unit tests and UI tests stop being flaky.
- Faster debugging: I can reproduce edge cases on demand — simulate a delayed callback, a failure due to insufficient balance, or a malformed callback signature — and capture logs locally.

How I integrate it into normal dev flow
- Local-only: My app has an ENV flag UPI_BACKEND_URL that points to either our staging PSP or the local simulator. In dev I set it to http://10.0.2.2:8080.
- CI: The simulator is lightweight; I run it as part of my UI test job (docker run) so end‑to‑end flows run without hitting real PSPs and without using external network calls.
- QA: I give QA a one‑liner to run the simulator on their laptop. They can click a button in a tiny admin UI to flip transaction states during exploratory testing.

A concrete example — mapping device to laptop
- Android emulator: use http://10.0.2.2:8080/initiate which the app uses instead of the PSP endpoint.
- Real device on the same Wi‑Fi: adb reverse tcp:8080 tcp:8080 then use http://localhost:8080 from the phone.
- Web tests: add an /etc/hosts entry like 127.0.0.1 mock-psp.local and run the simulator binding to 0.0.0.0.

The one honest failure (and why it matters)
A month in, a release candidate failed certification. Our PSP insisted on RSA-signed callbacks and a very specific canonical string format that my simulator didn’t produce. The mobile app passed all my local tests but failed with the real PSP because the signature algorithm and timestamp rounding mattered. I had glossed over signature verification during the simulator build because it felt like a delivery detail — a mistake.

The fallout: we still use the simulator for day-to-day dev and UI tests, but any change touching crypto, signature formats, or settlement behaviour goes to staging with the real PSP. The simulator is now explicitly documented as "API-compatible but not signature-authentic" and we added a final gating job that runs against the actual PSP sandbox with signed messages.

Tradeoffs I accepted
- Not a compliance or settlement replica. The simulator never attempts to replicate settlement windows, nodal accounts, or RBI timelines. Those are staging concerns.
- Maintenance cost. I spend a little time whenever a PSP changes a JSON field or introduces a new header. That’s tradeoff I accept because I’d spend the same time debugging flaky tests if I didn’t have the simulator.
- Security discipline. I had a moment of embarrassment when a teammate pushed the simulator’s config with a hard-coded test secret to our shared repo. We fixed that, and now the simulator uses local-only env files and is ignored by CI.

Why this fits Indian dev constraints
- Bandwidth matters. Running local tests saved me mobile data and avoided waiting for slow staging queues during evenings in my Bengaluru apartment.
- PSP variety matters. In India we juggle Razorpay, PhonePe SDKs, and bank-specific quirks. The simulator made it trivial to switch shapes between these without touching live integrations.
- Regulatory edges still require staging. RBI/settlement rules are outside the simulator’s scope; I accept that and keep a short, fast checklist for moving a build to staging when needed.

Concrete tips if you want to try it
- Start by mocking only what your UI needs. Don’t attempt to replicate full bank behavior. Minimal endpoints that return realistic payloads are enough.
- Use adb reverse and 10.0.2.2 — they remove the "my phone can't hit my laptop" problem without messing with DNS.
- Add a small admin page (two buttons: succeed, fail) so non-devs can exercise flows.
- Log every inbound/outbound message with the raw bodies. When the real PSP fails, those logs tell you exactly what differs.

What I walked away with
Mocks are not a replacement for staging, but a focused local simulator cut the daily friction by an order of magnitude. It turned payment testing from a stressy, late‑night chore into a five‑minute feedback loop. The tradeoff is obvious: you still must test crypto and settlement against real systems. But for the 95% of development where you’re iterating on UI and happy‑path flows, a tiny local simulator is the pragmatic win.