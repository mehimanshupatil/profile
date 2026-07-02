---
title: "Why I run a local S3 (MinIO) for fast payment/file testing — and the one bug it didn't catch"
pubDate: 2026-07-02
description: "I run a local S3-compatible server (MinIO) for day-to-day uploads and presigned URL testing to save data and time. It sped iteration—but missed a presigned-policy mismatch that hit staging."
author: "Arjun Malhotra"
image:
  url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&h=800&fit=crop&auto=format"
  alt: "A developer working on a laptop with code visible on the screen"
  caption: "Photo by Brooke Cagle on Unsplash"
  creditUrl: "https://unsplash.com/@brookecagle"
tags: ["dev-tools", "local-dev", "s3"]
---

The morning a QA testing an Android build in a Bangalore co‑working space complained that a file upload “succeeded” but the file never appeared in our S3 bucket, I learned two things: 1) waiting for CI to spin up and run full integration tests costs too much time, and 2) debugging uploads from a mobile on flaky office Wi‑Fi while burning through mobile data is miserable.

We were troubleshooting presigned POST uploads. Reproducing the issue on my laptop meant tethering my phone, waiting for a slow upload over my 4G (₹199/day kind of slow), and then waiting for cloud replication. Iteration took 20–30 minutes per change. I wanted the loop under a minute.

So I started running MinIO locally (sometimes on a small ₹300/month VPS) and pointing the AWS SDKs at it. It’s not glamorous, but it fixed the friction I actually had.

## The setup that actually saves time

My goal was simple: make uploads and presigned URL flows testable from any device on my network without touching AWS every time.

What I do now:

- Run MinIO in Docker on my dev machine (or on a tiny VPS if I need phone testing away from home).
- Expose it via Tailscale or local reverse proxy so my phone can hit the same endpoint without VPN fiddling.
- Use environment overrides so code just needs AWS_ENDPOINT and S3_FORCE_PATH_STYLE (or the SDK equivalent). No code changes, just config.
- Keep one small real S3 bucket for nightly integration tests that run in CI.

Concretely, a docker-compose.yml with MinIO, a tiny nginx for TLS, and systemd unit to keep it running got me from 20-minute loops to sub‑1‑minute loops. Upload from the phone, check the object appears instantly, tweak the policy or metadata, repeat.

Why this matters in India: office networks die, personal mobile data is precious, and a ₹300 VPS plus Tailscale means I can test with a real device on a customer's network without burning my monthly pack.

A few practical tips that saved me time:

- Use the same region and bucket names locally as prod. Most client SDKs don't care, so switching between endpoints is painless.
- Implement environment toggles at runtime: AWS_ENDPOINT and AWS_REGION are injected by our config loader.
- Add a tiny "minio-check" script in CI that fails fast if MinIO is being used in release builds.

Iteration speed improved dramatically. My patch–test–fix loop on presigned POSTs dropped to under two minutes. I stopped assuming network flakiness was the app; I could tell fast whether the client, the content policy, or the upload code was wrong.

## The tradeoffs that almost cost us

A couple of things bit me hard before I learned the limits.

1) Presigned POST policy differences
MinIO is S3‑compatible, but its policy validation is more permissive in one important way: it accepted a presigned POST with a Content‑Type wildcard that AWS S3 rejects. I had a test suite that passed against MinIO and we shipped a change. In staging, uploads from some Android WebViews failed with 403s. Debugging that on staging cost us a customer demo. The root cause: MinIO accepted the lax policy; AWS did not.

Lesson: don’t assume compatibility equals equivalence. Add at least one quick integration test against real S3 for security‑sensitive flows like presigned policies, ACLs, or server‑side encryption.

2) Server-side encryption / KMS
We use SSE‑KMS in production. MinIO can do server-side encryption, but it isn't KMS. A ledger system that relied on KMS‑generated encryption headers behaved differently in production (missing headers, different error codes). We had to run the final tests against real KMS-backed buckets.

3) Multipart upload edge cases
MinIO handled multipart uploads well until a particular client retried with the final complete call slightly out of order. AWS rejected that sequence while MinIO accepted it. This caused a subtle data corruption possibility that only showed up when large files were uploaded under poor network conditions.

4) Deployment complacency
I had a small failure in discipline: teams started treating MinIO tests as sufficient. That relaxed our "one real S3 check" rule until I saw the 403. The organizational cost was a noisy production incident and a back‑and‑forth apology with a customer.

Because of these tradeoffs I changed my routine:

- Keep MinIO for local iteration only. It’s the fast feedback loop.
- Require a single green run on a real S3 bucket before merging presigned policy, SSE/KMS, or multipart code.
- Add a CI gate that runs a couple of integration tests overnight against a real S3 with KMS enabled (cheap and infrequent so it doesn’t explode bill).

## Where it still shines, and what I now accept

Local S3 is still worth it. It reduced wasted mobile data, removed network flakiness from early debugging, and made device testing realistic (I can get a real Android WebView to upload to my MinIO endpoint in seconds). For day‑to‑day development it's unbeatable.

But I no longer treat MinIO as a drop‑in replacement for S3. It is a development accelerator with known blind spots: presigned policy validation, KMS behavior, and some multipart edge cases. The one failure that cost us was entirely avoidable with a single, cheap integration test against the real service.

Takeaway: Use MinIO (or any local S3) to iterate fast—especially when testing real devices on flaky networks—but add one mandatory real‑S3 sanity check for crypto, presigned policies, and multipart flows. It keeps the fast loop, and prevents being surprised in staging.