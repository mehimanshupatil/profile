---
title: "How I stopped hitting Razorpay in CI: recording real payment interactions (and the week it lied to me)"
pubDate: 2026-05-14
description: "I started recording real payment-provider HTTP interactions for tests and staging. It reduced flaky tests and data charges — until expired tokens and a leaked card number taught me the hard limits."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "Person typing on a laptop showing code and terminal windows"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["testing", "payments", "devtools"]
---

It was 2:10 a.m. and QA was on a call. A merchant on our staging app kept getting "payment pending" while the dashboard showed success. My tests — the same flow, same test card number — all passed locally and in CI. Production customers were seeing failures. I was staring at logs that said "200 OK" and "transaction_id: xyz" like a bad joke.

That night taught me the shape of the problem: our tests weren't talking to the real world; they were talking to our mocks. Mocks had drifted from the payment gateway (Razorpay, in our case). We needed the reliability of deterministic tests and the realism of actual API exchanges. The solution I built was simple: record real HTTP interactions (requests, responses, headers) from sandbox and production test flows, replay them in CI and on staging, and keep real network tests for an isolated job. This is the setup I use now — and the tradeoffs I learned the hard way.

Why record instead of always hitting the provider
- Hitting Razorpay/Razorpay sandbox for every CI run is slow and brittle. Banking APIs rate-limit. We burnt mobile data and dev time. CI flakes because of network blips or sandbox token expiry.
- Pure mocks drift. I once missed a new mandatory header Razorpay added and the mock silently accepted requests; production failed.
Recording gives the middle ground: deterministic playback for routine CI, realistic payloads for edge cases, and a small number of "live" runs to validate integrations.

What I actually recorded and how
I call the files "cassettes" — short JSON blobs containing:
- the full request (method, path, headers except secrets)
- the response (status, headers, body)
- the timestamp and an annotation for auth tokens or webhooks

My stack (Node/TypeScript) uses pollyjs for unit/integration tests and a small HTTP proxy on a ₹300 VPS for manual end-to-end captures. Steps:
1. Enable sandbox accounts on Razorpay/Paytm/NPCI where possible and run the flow manually (web checkout, webhook, callback).
2. Let the proxy record the entire exchange (including webhook POSTs from the gateway).
3. Run a small sanitizer script:
   - Replace Authorization headers with "REDACTED".
   - Hash card numbers / UPI IDs and replace last 4 digits only.
   - Remove cookies, internal IDs we don’t need.
4. Commit sanitized cassettes to a mono repo directory like test/cassettes/<provider>/.
5. In CI, start pollyjs in "replay" mode. Tests use recorded requests by matching method+path+body. If no cassette matches, the test fails.

Why this works in practice
- Speed: playback is local — tests that previously hit the network 8–12s now run under 300–400ms.
- Predictability: CI no longer flakes when the bank’s network jitters.
- Realism: edge-case responses are real responses (timeouts, 422s, webhook retries) so developers see the exact payload shape.

The constraints you’ll hit (and my mistakes)
1. Tokens expire. Big one. I recorded a week-long run and then wondered why CI started failing with 401s. Sandbox tokens and session-specific signatures are garbage to record. Fix: identify auth headers that must be stripped and replace them with stable placeholders. Keep a short "live" CI job (daily or nightly) that actually hits the sandbox to detect changes in auth schemes.
2. Sanitize aggressively. I once committed a cassette with a card number fragment and a literal customer UPI ID. Security review flagged it; I had to rotate keys and remove history. Don’t be lazy. Mask everything that might be PII or secret before committing.
3. API evolution sneaks in. A bank added a header and changed an error code. Our cassettes kept replaying the old behavior and tests passed while staging failed. Countermeasure: add a "schema validation" step on top of cassettes — JSON schema for responses that our live nightly job validates. If the schema differs, fail the nightly and alert the team.
4. Webhook timing matters. Some gateways retry webhooks with backoff; a simple cassette doesn't simulate timing semantics. For flaky webhook-driven logic, I keep a small runner that replays webhooks with the recorded retry schedule.
5. Storage and noise. Cassettes proliferate. We prune and compress older ones; for big payloads (full PDFs, images), store them in an S3 bucket (shallow-cost in INR — our backup costs about ₹700/month) and keep only metadata in repo.

Where it still breaks
Recording cannot replace contract-level integration tests. It won't catch a provider changing their signature algorithm or a new compliance header that your production auth demands. It also won't detect intermittent network differences, like a mobile carrier dropping POST bodies on small MTU devices. We still run a gated "live integration" pipeline against the sandbox that runs once per day and a "smoke" production job for deployments, but those are limited and monitored.

The week it lied to me
Two months after adopting cassettes, I relaxed maintenance. A bank changed error formatting and our nightlies started failing silently because the nightly job used an older cassette. A merchant reported failed settlements. I traced it back: we had a cassette that showed the old, non-errorful response. I had to roll back, re-record, and manually reconcile settlement records. The lesson: cassettes reduce noise, not responsibility. Treat recorded tests as living artifacts that need the same attention as code.

What I walk away with
Recording real payment interactions bought us predictable CI, fewer late-night "it works on my machine" calls, and much lower data and sandbox usage. But it also introduced a maintenance task: sanitize, rotate, validate. The right balance for us: replay for day-to-day CI, a small set of live tests that run nightly, and strict sanitization plus a schema check to catch provider changes. That combination saved developer hours — until it didn't, and then it taught me to pay attention.

If you build this: automate the sanitizer and the nightly live check from day one. Without those two, cassettes quietly become a brittle comfort blanket.