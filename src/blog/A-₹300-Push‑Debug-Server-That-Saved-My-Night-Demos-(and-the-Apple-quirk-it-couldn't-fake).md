---
title: "A ₹300 Push‑Debug Server That Saved My Night Demos (and the Apple quirk it couldn't fake)"
pubDate: 2026-07-06
description: "How I built a tiny FCM/APNs‑faking server on a cheap VPS to debug push notifications from real phones over mobile data — and why it still needs a real device run once a week."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1515879218367-846c7d2ffb1b?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop with a smartphone and coffee on a wooden table"
  caption: "Photo by Annie Spratt on Unsplash"
  creditUrl: "https://unsplash.com/@anniespratt"
tags: ["mobile-testing", "developer-tools", "infra"]
---

It was 11:30 pm and I had to demo a push‑heavy feature the next morning to a customer in Mumbai. On my laptop the flows worked perfectly. On my phone — using Airtel home‑WiFi and mobile data — nothing. No pushes. The logs from our staging backend showed "200 OK" from the push provider. The app showed token uploads. The product manager was calming, which meant panic was imminent.

I’d seen this before: a mismatch between what the server thought it sent and what the device actually received. In the past that meant walking into meetings with a red face and a half‑baked explanation. So I stopped trusting "200 OK" as proof. I built a tiny, cheap push‑debug server that sat between our backend and the real FCM/APNs endpoints. It logs everything, simulates failures, and lets me exercise the exact payloads over a real mobile link. Cost: roughly ₹300/month for a small VPS and an hour or two to wire it up. The ROI was immediate.

## What the server does (and why it matters)
I needed three things from a debug layer:

1. Capture the exact HTTP/2 payloads we send to APNs and the JSON to FCM. Not just a "delivered" metric.
2. Replay and simulate provider behavior: slow responses, 429 rate limits, invalid token replies, and randomized dropped connections.
3. Be reachable from phones over mobile data without me paying for a separate SIM or juggling ngrok sessions.

So I landed on a tiny Node.js service with two modes. In proxy mode it forwards to the real provider and logs request/response pairs to a small SQLite DB. In simulate mode it acts like APNs/FCM and returns configurable status codes and delays. I expose a debug UI to view recent calls, filter by device token, and replay any request with modified headers.

Why this beats raw logs: our backend logs showed "200" from the provider. That meant our server-to-provider conversation looked fine. But the device might get a stale token, or the carrier might drop HTTP/2 keepalives, or the app might reject malformed payload fields. Seeing the exact wire payloads and the provider's raw headers lets you separate "provider issue" from "app/device" issue in minutes instead of hours.

## The cheap, practical stack
I run the service on a ₹300‑₹400/month VPS on a Mumbai region (latency matters for mobile tests). The stack is intentionally minimal: Express + http2 + a small SQLite log store. I use systemd to keep it running and rotate logs.

Reaching mobile devices from the public internet in India has one annoying detail: many home/office ISPs are behind CGNAT, and phones on mobile networks can be flaky with inbound connections. Ngrok works, but I wanted stability and low bandwidth cost. So I front the VPS with Tailscale. Phones run Tailscale via an always‑on test profile (or, when that's not possible, I use a small app on the phone to poll the debug server’s webhook). For quick demos I also use HTTPS with certs from Let's Encrypt.

The simulate mode is where most of the value is. I add a small UI where I can toggle "50% drop rate" or "429 after N calls". That lets me script how our backend should behave under stress or token churn without actually burning our FCM quota or tripping APNs rate limits in production.

Everything together cost me ~₹300/month and maybe 4–6 hours to build and harden. The first time I used it, I found the mobile app was rejecting payloads with an extra custom field our web UI had started sending. Fix took 10 minutes.

## The awkward failure I didn't expect
There's a constraint that bit me hard: I couldn't perfectly simulate APNs' TLS and HTTP/2 behavior for iOS devices. APNs requires TLS mutual auth for certain setups and modern iOS stacks also react to APNs' push certificates and specific connection patterns Apple enforces. In simulate mode my server would happily accept the token and reply "202 Accepted," but a real iPhone connected to APNs would later drop the notification because the device token had been rotated by Apple or because the provider had performed a sanity check my fake couldn't mimic.

In short: my debug server is fantastic at catching payload and backend problems, and at simulating throttles and network chaos. It is not a complete substitute for the real provider's security checks. The day I relied on it fully, a validation bug slipped through because APNs rejected tokens in a way my simulator didn't emulate. We discovered it only when a QA device actually connected to Apple's APNs.

That failure changed my workflow. Now I always run one real device test over the real network with the real provider before client demos. The debug server covers the other 90% of cases and saves me from late‑night rewrites — but not all.

## Small tradeoffs worth calling out
Maintenance: the server needs upkeep. Providers change error codes and payload expectations. Roughly once a quarter I spend 30–60 minutes aligning it to new provider behavior.

Security: I store logs with device tokens and payloads. That required a brief audit to ensure no PII leaked into logs and an auto‑delete policy after 30 days. Don’t skip this if you work with real user data.

Carrier quirks in India: testing over Jio/Airtel/Vi produced different failure modes — Jio’s NAT timeouts are shorter, Airtel’s LTE handovers dropped keepalives more often. Having a VPS in Mumbai reduced test variability; having phones on different carriers made the difference between "probably fine" and "definitely broken."

## The takeaway (the one thing I actually walked away with)
If you build push‑reliant features, spend an evening to make a small push‑debug proxy you control. It cuts the "it worked on my laptop" argument down to minutes by showing the real wire payloads and letting you simulate flaky networks and rate limits. But don't treat it as a replacement for a real provider connection. Keep one real device on a real mobile network for final verification — that little extra step has saved me worse embarrassment than any fake 200 OK ever could.