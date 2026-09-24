---
title: "A tiny on‑demand S3 proxy that stopped my CI chewing bandwidth — and the stale file that taught me cache humility"
pubDate: 2026-09-24
description: "I built a small S3 proxy (₹300 VPS) that cached large test fixtures for CI and local dev, cutting builds and egress costs — until a stale object made a test lie."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A laptop on a wooden desk with a notebook and a cup of coffee"
  caption: "Photo by Firmbee on Unsplash"
  creditUrl: "https://unsplash.com/@firmbee"
tags: ["developer-tools", "ci", "infra"]
---

It was 1:10 AM and our CI had been running for two hours. The same job was downloading a 500 MB fixture from S3 on every new runner — hitting our hosted CI egress repeatedly, failing sometimes because the office connection dropped, and burning through the team's tiny monthly cloud budget. My laptop was on the meet-calling everyone to sleep tone in my head.

We had three large test fixtures (media blobs and a synthetic dataset) that developers and CI repeatedly pulled. Each CI worker re-downloaded them for every job because we didn't have a shared cache, and our self-hosted runners were edge-located with flaky upstream links over a Bengaluru office NAT. I needed a cheap, reliable cache that behaved like S3 for GETs and required near-zero changes to test harnesses.

What I built: a tiny HTTP proxy that answers S3 GETs, caches objects to disk, serves Range requests, respects If-None-Match/ETag, and falls back to the real S3 when it can't be reached. I deployed it to a ₹300/month VPS (one of those small DigitalOcean/Hetzner machines you see in side‑projects). Pointing CI at a single S3 endpoint (S3_ENDPOINT=http://proxy.internal) was the only config change.

Why it worked

- It’s dumb by design. The proxy only needs to support signed GET URLs (or fetch with server-side creds), Range, Content-Length, ETag, and If-None-Match. No multipart PUTs, no ACLs, no complicated auth flows.
- Disk cache beats repeated downloads. The first job pulls 500 MB; subsequent jobs read from the VPS disk at ~100+ MB/s from the VPS-local SSD. CI job time dropped where network was the bottleneck.
- It reduces egress. Our hosted CI egress bill (and the time lost to slow transfers) dropped significantly — rough numbers: the proxy cost ₹300/month, and for our team it saved roughly ₹2,500–₹4,000/month in CI egress and developer time.
- Local dev wins. Developers on mobile hotspots or slow home ISPs could mount the proxy as a local endpoint (via an SSH tunnel or a tiny VPN), saving data and time.

How I deployed it without messing with S3 or tests

- I made the proxy accept the same GET URLs our tests used. If a URL was presigned, the proxy validated it by either verifying the signature or, more simply, fetching the object using its own AWS creds and returning it — that avoided changing test code.
- Healthcheck and transparent fallback: the proxy exposes /health and, on cache miss, attempts to fetch from S3. If the fetch fails, CI falls back to the real S3 URL (configurable). This keeps the proxy from becoming a hard stop.
- TTLs and ETag flow: cached files had a default TTL (24 hours) and the proxy honored ETags. It replied 304 when S3 reported nothing changed. For big static test fixtures we treated them as immutable by default.

The day it lied to us

A week in, a flaky integration test started passing in CI but failing locally for a couple of engineers. Local runs were pulling a freshly generated fixture (with a bug we’d fixed), but CI kept using the old one. The proxy had cached the old file and served it until its TTL expired. The team had been overwriting the same S3 key in place (copying a new object over an old key), which in our workflow didn't change the ETag reliably because of how the upload was done.

Result: CI was testing the old behaviour. We shipped a PR that relied on the new fixture and it passed CI but failed in a customer scenario.

What I learned (the hard rules)

- Never rely on implicit immutability. If you intend an object to be mutable, either keep a short cache TTL or serve versioned keys. We switched to a policy: test fixtures are versioned per CI run (commit SHA suffix) or we explicitly bump a "fixture-version" header.
- Use S3 versioning or include content hash in filenames. This is the only bulletproof cache-busting strategy. We added a prepush step that uploads fixtures as fixture-v<sha>.bin and updates a small pointer file (JSON) that CI reads to pick the correct key.
- Monitoring matters. I added simple metrics from the proxy: cache hit ratio, last fetch timestamp per key, and a small alert if a key hasn't been refreshed in >48 hours. That caught the next silent staleness before it affected users.
- Single point of failure mitigation. The fallback-to-S3 behavior is non-negotiable. So is a short circuit in CI to bypass the proxy if it returns a non-200 within a tight timeout.

Tradeoffs and honest constraints

- Complexity vs. benefit. Building and operating the proxy added one more service to our stack. It needs disk, logs, and occasional restarts. For small teams with tiny fixtures, the operational overhead might not be worth it.
- Security tradeoffs. The proxy touched S3 creds if it fetched on behalf of presigned URLs. I locked it down to a single IAM role with least privilege and restricted IP ranges to our CI runners, and we rotated credentials monthly.
- Not a replacement for a proper artifact store. If you have an artifact repository that supports replication (Nexus, Artifactory, or S3-backed cache with CloudFront), use that. The proxy is a nimble fix for teams that can't add another managed service and need quick wins on CI time and data cost.

The takeaway I actually walked away with

If your CI or dev workflow re-downloads the same large blobs repeatedly, a small on‑demand caching proxy is a pragmatic win — cheap, fast to implement, and immediately tangible in India where bandwidth and egress costs matter. But treat cached objects as immutable unless you design for mutations: version keys, set clear TTLs, and monitor the cache. That one extra 24‑hour TTL saved me a lot of build time until it nearly shipped a lie.