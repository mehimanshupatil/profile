---
title: "How a tiny repo‑local proxy let me develop payment flows without burning mobile data"
pubDate: 2026-05-12
description: "I built a small repo-local HTTP proxy that records and replays third‑party API responses so I can work offline or on spotty mobile data — here’s how it works, why it broke once, and the guards I added."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Open laptop on a wooden desk with a notebook and coffee cup beside it"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["dev-tools", "offline-dev", "india"]
---

It was a Tuesday evening and my home broadband had decided three different things in five minutes. My CI queue was full because every push re‑ran the integration tests that call Razorpay and a few internal mocks. Each run chewed at my ₹199 prepaid “work” mobile recharge when I tethered, and Razorpay started rate‑limiting our sandbox after the third re‑try. I needed to iterate UI flows that depended on external API responses, but I didn’t have the bandwidth or the patience to keep ripping through live requests.

What I ended up with was embarrassingly small: a repo‑local HTTP proxy that can record responses the first time you hit an external endpoint, then replay them the rest of the day. It runs on localhost, is starting‑point simple (Python + tiny DB), and lives in the repo so everyone on the team can use it without VPNs, hacks, or global fetch rewrites. It’s saved me hours and hundreds of megabytes of mobile data. It also caused a nearly missed bug in staging one week — which taught me the real tradeoffs.

Why a proxy, and why repo‑local

Calling real third‑party APIs during local development is convenient until it’s not. Rate limits, flaky office Wi‑Fi, slow sandbox environments, and data costs all add up. Solutions I tried before this: heavy mocking in the app (brittle), shared dev servers (costly), and ad hoc curl dumps (messy). I wanted something that:

- Worked immediately for teammates on Linux/Mac.
- Required no code changes in the app (just point at localhost).
- Could record real responses so the frontend/auth flows saw realistic payloads.
- Could be turned off easily when we needed fresh data.

A repo‑local proxy met those needs. Because it’s checked into the repo, onboarding is "pip install -r dev-requirements" and "npm run dev" simple.

What I built (short version)

The stack is intentionally minimal. The proof of concept is three files:

- proxy.py — a small mitmproxy script (or a tiny Flask app with requests) that listens on 127.0.0.1:8080, forwards requests upstream in record mode, and returns cached responses in replay mode.
- cache.db — SQLite file mapping request-signature → response (body, headers, status, recorded_at).
- dev.sh — helper to run in record or replay mode, and a flag to bypass the cache.

Record mode: the first time I call POST https://api.razorpay.com/v1/orders, the proxy forwards to Razorpay, stores the full response in SQLite (including headers), and returns it to my app. Replay mode: the proxy matches request signature (method + path + selected headers + body hash) and returns the stored response without touching the network.

How I use it in practice

I add a single environment variable local to my shell: PAYMENT_API_BASE=http://127.0.0.1:8080/https://api.razorpay.com/v1 — my proxy rewrites the incoming URL and knows to strip the first path segment as the upstream. For services with different hosts, I keep a tiny hosts.json per repo and map them.

Workflow looks like this: start the proxy in record mode on a fresh day, click the flow in the UI, let the proxy record the responses we need, switch to replay mode, and iterate UI and logic offline or on cheap mobile tether. When I’m done, I commit any new mappings (only the small DB entries relevant to feature) or discard them if they contain secrets.

Three useful defaults I added early on, that you should too

- TTL on cache entries (default 8 hours). Not everything should be eternal.
- Header whitelist for request matching (ignore Date, Authorization by default).
- Explicit bypass (X-Proxy-Bypass) so CI or one-off calls always hit the real endpoint.

The week it almost cost me a release

Two months in, I shipped a change that used a newer field in Razorpay’s response to enable a UI path. All local testing and my teammate’s demo went well because the proxy replayed the old responses. On staging, where the sandbox had the new field populated, the UI crashed. We discovered this during staging validation — fortunately not in production — but it was a wakeup call.

Root cause: stale cached responses plus my sloppy habit of not running the proxy in record mode before a release. The fix was simple: add a pre‑release dev script that checks whether cached entries cover any changed contract (compare recorded_at against git commit date for the client). We also started adding a single "smoke‑record" CI job that runs in record mode once per day against sandbox endpoints with a strict budget and a virtual credit card.

Tradeoffs and real-world limitations

This isn’t magic. The proxy hides network problems and server‑side variability. It can mask performance regressions and authentication flows that depend on time‑sensitive tokens. It’s not a substitute for integration tests against real sandboxes. And because it stores recorded responses, you must be careful about secrets—strip Authorization headers before you persist anything.

It also requires discipline from the team: toggle to record mode when you add a new integration, and run a “refresh” before release. We lost time once because a new webhook field wasn’t in the cache. That failure changed how we used the tool more than the tool itself did.

What I learned and now do differently

- Make the proxy repo-local and opt-in. Global tools become forgotten cruft.
- Always have one small CI job that refreshes critical endpoints daily (cost < ₹300/month if you cap requests).
- Treat cached records as temporary developer artifacts, not source of truth.
- Use the proxy to save iteration time, not as a replacement for sandbox testing.

Takeaway: a light, local proxy buys you iteration time and saves mobile data, but it needs clear TTLs and a tiny "refresh before release" ritual to not lie to you when it matters.