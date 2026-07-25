---
title: "A tiny payment‑callback recorder that saved my nightly tests (and the weekend it cost me)"
pubDate: 2026-07-25
description: "I built a small service to capture real payment webhooks, replay them locally, and learned the hard way about PII, idempotency, and signing. Practical, cheap, imperfect."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with a code editor visible on the screen"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["payments", "testing", "developer-tools"]
---

It was 11:30pm and our payment flow still failed. The UI showed success, banks said success, but our webhook never landed in staging. I watched logs — nothing. I rebooted a phone, toggled mobile data, and pinged Razorpay support (hello, polite waiting tone). I wasted two hours and used nearly a gigabyte of mobile data testing callbacks. I didn't want to do that again.

We run integrations with three payment providers and two banks. Their sandboxes are decent, but real callbacks are slightly different: extra fields, different timestamps, occasional missing fields, and signatures that fail if you change a single header. On top of that, our office internet is flaky and my home connection has 200ms latency on bad days. Reproducing failures meant either: a) triggering a live payment (expensive, noisy), or b) failing to reproduce and guessing.

So I built a tiny recorder: a small public endpoint that accepts provider callbacks, stores the payloads, and lets me replay them to any local or staging URL on demand. It costs me ₹300/month (small VPS) and an evening of wiring. It saved nights after the first week — but not before it taught me some blunt lessons.

## What it does (practical, not magical)

The recorder is a single Express app (could be Flask) behind a small VPS with a static IP. I used a ₹300/month Linode/Vultr box because ngrok kept expiring my free tunnels and I hate dependency on one laptop being online.

Flow:
- Payment providers call https://recorder.example.com/hooks/<provider>.
- Recorder saves the raw HTTP request: headers, body, timestamp.
- Each recorded entry has an ID and a tiny UI where I can:
  - scrub PII (phone, email, account numbers) with one click,
  - edit fields (simulate missing params, change statuses),
  - replay it to any target URL with adjustable delay and header overrides.
- Replays re-send headers and body exactly (or modified) so signature verification can be tested.
- Access to the UI and replay API is behind a simple JWT and IP allowlist; webhooks are accepted without auth to match provider behaviour.

Why this is useful: instead of triggering a live payment, I grab a recorded real webhook and replay it against my localhost (using localtunnel/tailscale) or staging. I simulate retries, missing fields, or bank-specific quirks. No more burning mobile data or waiting for a sandbox edge case.

## The parts that mattered (and the choices I made)

Signature fidelity: Razorpay and some banks sign payloads using headers and raw body. If you modify the body in the recorder UI, signature verification breaks. So the recorder supports two modes: "exact replay" that preserves raw bytes and headers, and "editable replay" where I accept that server-side verification will likely fail (useful when I'm debugging app logic after signature verification passes). For exact replay I store the raw request buffer.

Idempotency and nonces: many callbacks include provider-specific nonces or transaction IDs that our system marks as already-processed. When replaying, you can inject a fresh id into the body or header. This is manual but faster than creating a full payment again.

Developer convenience: a "replay to localhost" button via my Tailscale hostname is the killer feature. No fiddly port-forwards. The UI is intentionally ugly — fast, not pretty.

Cost and infra: ₹300/month VPS + a tiny persistent disk. No K8s, no Terraform complexity. If you prefer managed, a Cloud Run instance would work.

## The weekend I lost: privacy and a bad default

I shipped the recorder with "store raw request" as default and a simple CSV export for offline debugging. A teammate needed a dump to analyze a rare failure and I handed them a DB dump. It contained names, phone numbers, email addresses, and partial account metadata. Not a breach, but enough to make my manager angry and HR ask for a write-up. I spent a weekend:

- writing a PII scrubber that redacts phones, emails, and IBAN-like fields,
- adding a "consent required" step before export,
- rotating the app's keys and removing the last dump from S3,
- putting a note in the README: "Never export raw payloads without approval."

That was the real tradeoff: usefulness vs safety. Raw data makes debugging simple; raw data in the wrong hands is a mess. My solution now keeps raw data encrypted at rest and defaults to showing only a scrubbed preview. Exports require a second factor and an audit log.

## Where it still breaks (so you don't over-trust it)

- OTP flows and 3‑D Secure: absolutely out of scope. You can't replay a webhook to recreate user-facing OTP screens. This is for server-to-server callbacks only.
- Race conditions and time-related bugs: if a sequence of callbacks depends on timing, replaying a single callback may not expose the original bug. I added configurable inter-callback delays, but some bugs still require a real end-to-end test.
- Idempotency logic: if your app uses provider nonces for dedupe, you will need to regenerate IDs. That's a manual step that occasionally frustrates me.
- Compliance: you must check your company policy and the provider T&Cs. Some providers forbid storing live payloads; others require consent for PII retention. I spoke to legal and documented retention windows (30 days, then garbage-collected).

I still trigger live payments sometimes. The recorder didn't replace them — it reduced the number. The win was predictable: fewer late-night sessions chasing asynchronous mysteries.

If you build one, keep the scrubber first, the JWT second, and an automatic purge policy third. If you don't want a public VPS, run the recorder on your laptop and use Tailscale — but remember: when your laptop's offline, your recorder is too.

Takeaway: a minimal recorder + safe defaults turned nights of guesswork into five‑minute replays. It cost a cheap VPS, an embarrassing privacy weekend, and a handful of scripts. I'm keeping it. My unpaid takeaway: useful dev tools are the ones that make it safer to reuse real data, not the ones that let you hoard it.