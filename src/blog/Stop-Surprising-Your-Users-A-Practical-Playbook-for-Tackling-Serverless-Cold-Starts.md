---
title: "Stop Surprising Your Users: A Practical Playbook for Tackling Serverless Cold Starts"
pubDate: 2026-03-31
description: "Concrete, India-aware tactics to reduce serverless cold start latency—practical fixes, cost tradeoffs, and when to pick edge or provisioned concurrency."
author: "Rohan Deshpande"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=2000&h=1000&fit=crop"
  alt: "Developer workspace with laptop open to code, coffee cup beside it"
  caption: "Image credit: Unsplash / Annie Spratt"
  creditUrl: "https://unsplash.com/photos/MP0IUfwrn0A"
tags: ["serverless", "performance", "cloud"]
---

We shipped a tiny Lambda that validated UPI callbacks. Function works perfectly in staging—until users in smaller towns complained about timeouts. The root cause wasn’t network jitter or the bank’s API; it was serverless cold starts. A hot function answered in 40–60 ms. A cold start? 700–1,200 ms. For a payment flow, that feels like an eternity.

If you run customer‑facing APIs in India, you’ll hit this sooner than you think. Mobile networks add 100–300 ms of RTT, and users notice added latency above a few hundred milliseconds. Here’s a practical playbook I use to reduce serverless cold start pain without bankrupting the team or swapping the entire stack.

What is a serverless cold start—and why it matters
- Cold start: the time a serverless platform spends provisioning a runtime and running your init code before your handler runs. It shows up as long tail latency on the first request after idle or scale events.
- It matters when you care about 95th/99th percentile latency (payments, login, interactive UIs) or when external callers give you tight timeouts (webhooks, third‑party integrators).

Quick checklist to triage
1. Measure first. Add real synthetic checks (from regions where users are) that record cold vs hot latencies. Don’t guess.
2. Identify candidate functions: those with >300 ms cold start and user‑visible impact.
3. Check runtime, package size, and init code. These are the usual suspects.

Practical fixes (fast wins)
- Move expensive work out of module scope. Lazy‑load heavy libraries inside the handler. Instantiating DB clients or SDKs during the global init forces every cold start to pay the cost.
- Reduce deployment package size. Trimming from 50 MB to 5–10 MB can shave hundreds of ms in some runtimes.
- Choose a faster runtime where feasible. Node.js and Go generally cold start faster than Java/.NET. If you’re on JVM for business logic, consider wrapping the hot path in a small, fast function or using native images (Graal) for lower startup time.
- Cache network calls. If your function calls third‑party APIs during init (discovery, JWKS fetching), persist those values in a fast cache (DynamoDB with DAX, Redis, or even S3 with local TTL) so cold starts don’t stall on remote fetches.

Stronger fixes (cost and complexity tradeoffs)
- Provisioned Concurrency (PC): AWS, and similar features elsewhere, keep a set of warm instances ready. It’s reliable and straightforward to apply to critical endpoints (payment callbacks, auth). Downside: you pay for the reserved capacity (memory × time) even when idle. For low‑traffic functions this can be surprisingly expensive—measure before you flip the switch.
- Autoscaling warmers/time‑based keep‑alives: periodic pings keep functions warm. Simple cron pings cost very little, but they’re brittle (missed pings create gaps) and unnatural at scale. Use them only as a stopgap.
- SnapStart and native snapshots: AWS Lambda SnapStart (for Java) and equivalent snapshotting reduce cold-start costs by initializing the function and snapshotting. Effective but currently limited to certain languages and platforms.
- Move to edge functions: Cloudflare Workers, Fastly Compute, and V8 isolates have very low startup latency and are great for mostly stateless routes (CDN-auth, A/B tests, static API responses). They may not suit heavy CPU work or specialized native libraries.

When to accept some cold starts
- Background jobs and non‑interactive APIs tolerate a few hundred ms extra. Don’t over‑optimize everything—focus on critical, user‑facing flows.
- If your traffic shape is highly spiky but bursts are short, PC can burn money during idle time. Consider a hybrid approach: PC for a small baseline, edge or warmers for burst handling.

India specifics and real constraints
- Mobile users in India suffer higher baseline latency; shaving even 200–300 ms off the server path improves perceived performance more than you'd expect.
- Cost sensitivity: for startups with narrow margins, provisioning concurrency across many functions is a fast way to raise monthly cloud bills in INR. Apply PC selectively—one or two endpoints, not your whole backend.
- Vendor differences: some CDNs and edge platforms bill by request with tiny per‑request cost, which is appealing for high‑traffic read endpoints. But they can lack features (native DB connectors, long‑running processes) you expect from cloud‑provider functions.

A real tradeoff I lived through
We moved our auth flow to provisioned concurrency for a month. Login latency (P95) dropped from ~600 ms to ~150 ms—users loved it and error rates fell. The bill, however, jumped 35%. We retained PC for the login path and removed it from lower‑traffic flows, and then invested in lazy init and package trimming for others. The result: most user pain disappeared and our bill normalized to an acceptable level.

A recommended sequence to act on
1. Measure cold vs hot: synthetic monitors from relevant Indian regions.
2. Fix cheap wins: lazy init, shrink packages, move I/O out of global scope.
3. Apply PC only to the most critical endpoints.
4. Consider edge for stateless, latency‑sensitive reads.
5. Revisit periodically—runtime improvements and platform features change over time.

Final thought
Serverless cold start is not a binary problem you solve once. It’s a set of tradeoffs—latency, cost, complexity—that shift with your app and user base. Start with measurement, fix the low‑cost stuff, and then spend money only where the business impact justifies it. If you treat latency like a first‑class product metric, you’ll make focused decisions that keep users happy without blowing up your cloud bill.

Want a short checklist you can run in 30 minutes on your project? Ping me and I’ll share the steps I use to measure and classify functions quickly.